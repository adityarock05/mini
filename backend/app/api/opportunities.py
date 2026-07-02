from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.opportunity import (
    Opportunity,
    Application,
    ApplicationStatus,
    Task,
    TaskStatus,
    OpportunityType,
)
from app.models.user import User, UserRole
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])


# Schemas
class OpportunityCreate(BaseModel):
    title: str
    description: str
    type: str  # RESEARCH or INTERNSHIP
    skills: List[str]
    duration: str
    stipend: Optional[str] = None
    deadline: date


class OpportunityResponse(BaseModel):
    id: str
    title: str
    description: str
    type: str
    faculty_id: str
    faculty_name: str
    skills: List[str]
    duration: str
    stipend: Optional[str]
    deadline: str
    is_open: bool
    created_at: str
    is_applied: bool = False
    application_status: Optional[str] = None

    class Config:
        from_attributes = True


class ApplicationCreate(BaseModel):
    cover_letter: str


class ApplicationResponse(BaseModel):
    id: str
    opportunity_id: str
    opportunity_title: str
    student_id: str
    student_name: str
    status: str
    cover_letter: str
    applied_at: str

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    status: str  # UNDER_REVIEW, SHORTLISTED, ACCEPTED, REJECTED


class TaskCreate(BaseModel):
    title: str
    description: str
    category: str
    deadline: Optional[date] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None


class TaskResponse(BaseModel):
    id: str
    student_id: str
    title: str
    description: str
    category: str
    deadline: Optional[str]
    status: str
    progress: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[OpportunityResponse])
async def list_opportunities(
    skills: Optional[str] = None,
    is_open: Optional[bool] = True,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all opportunities with optional filters."""
    query = select(Opportunity).options(selectinload(Opportunity.faculty))

    if is_open is not None:
        query = query.where(Opportunity.is_open == is_open)

    # Filter by deadline (only show opportunities with future deadlines)
    query = query.where(Opportunity.deadline >= date.today())

    result = await db.execute(
        query.order_by(desc(Opportunity.created_at)).offset(skip).limit(limit)
    )
    opportunities = result.scalars().all()

    return [
        OpportunityResponse(
            id=str(opp.id),
            title=str(opp.title),
            description=str(opp.description),
            type=str(opp.type.value) if hasattr(opp.type, "value") else str(opp.type),
            faculty_id=str(opp.faculty_id),
            faculty_name=str(opp.faculty.display_name) if opp.faculty else "Unknown",
            skills=list(opp.skills) if opp.skills else [],
            duration=str(opp.duration),
            stipend=str(opp.stipend) if opp.stipend else None,
            deadline=opp.deadline.isoformat()
            if hasattr(opp.deadline, "isoformat")
            else str(opp.deadline),
            is_open=bool(opp.is_open),
            created_at=opp.created_at.isoformat()
            if hasattr(opp.created_at, "isoformat")
            else str(opp.created_at),
        )
        for opp in opportunities
    ]


@router.post(
    "/", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED
)
async def create_opportunity(
    opportunity_data: OpportunityCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new opportunity (faculty or authority only)."""
    # Only faculty and authority can create opportunities
    if current_user["role"] not in [UserRole.FACULTY.value, UserRole.AUTHORITY.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty and authority can create opportunities",
        )

    # Validate opportunity type
    try:
        opp_type = OpportunityType(opportunity_data.type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid opportunity type. Must be one of: {[t.value for t in OpportunityType]}",
        )

    # Validate deadline is in the future
    if opportunity_data.deadline < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deadline must be in the future",
        )

    # Create opportunity
    opportunity = Opportunity(
        faculty_id=current_user["id"],
        title=opportunity_data.title,
        description=opportunity_data.description,
        type=opp_type,
        skills=opportunity_data.skills,
        duration=opportunity_data.duration,
        stipend=opportunity_data.stipend,
        deadline=opportunity_data.deadline,
        is_open=True,
    )

    db.add(opportunity)
    await db.commit()
    await db.refresh(opportunity)

    # Get faculty name
    faculty_result = await db.execute(
        select(User).where(User.id == opportunity.faculty_id)
    )
    faculty = faculty_result.scalar_one_or_none()

    return OpportunityResponse(
        id=str(opportunity.id),
        title=opportunity.title,
        description=opportunity.description,
        type=opportunity.type.value,
        faculty_id=str(opportunity.faculty_id),
        faculty_name=faculty.display_name if faculty else "Unknown",
        skills=opportunity.skills or [],
        duration=opportunity.duration,
        stipend=opportunity.stipend,
        deadline=opportunity.deadline.isoformat(),
        is_open=opportunity.is_open,
        created_at=opportunity.created_at.isoformat(),
    )


@router.get("/my/applications", response_model=List[ApplicationResponse])
async def list_my_applications(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's applications."""
    try:
        result = await db.execute(
            select(Application)
            .options(
                selectinload(Application.opportunity), selectinload(Application.student)
            )
            .where(Application.student_id == current_user["id"])
            .order_by(desc(Application.applied_at))
        )
        applications = result.scalars().all()

        return [
            ApplicationResponse(
                id=str(app.id),
                opportunity_id=str(app.opportunity_id),
                opportunity_title=app.opportunity.title if app.opportunity else "Unknown Opportunity",
                student_id=str(app.student_id),
                student_name=app.student.display_name if app.student else "Unknown",
                status=app.status.value if hasattr(app.status, "value") else str(app.status),
                cover_letter=app.cover_letter,
                applied_at=app.applied_at.isoformat(),
            )
            for app in applications
        ]
    except Exception as e:
        print(f"Error in list_my_applications: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Server Error: {str(e)}",
        )


# Task Manager (Scholar's Ledger)
@router.get("/my/tasks", response_model=List[TaskResponse])
async def list_my_tasks(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's tasks."""
    query = select(Task).where(Task.student_id == current_user["id"])

    if status:
        try:
            task_status = TaskStatus(status)
            query = query.where(Task.status == task_status)
        except ValueError:
            pass

    result = await db.execute(query.order_by(desc(Task.created_at)))
    tasks = result.scalars().all()

    return [
        TaskResponse(
            id=str(task.id),
            student_id=str(task.student_id),
            title=task.title,
            description=task.description,
            category=task.category,
            deadline=task.deadline.isoformat() if task.deadline else None,
            status=task.status.value,
            progress=task.progress,
            created_at=task.created_at.isoformat(),
            updated_at=task.updated_at.isoformat(),
        )
        for task in tasks
    ]


@router.post(
    "/my/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED
)
async def create_task(
    task_data: TaskCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new task."""
    task = Task(
        student_id=current_user["id"],
        title=task_data.title,
        description=task_data.description,
        category=task_data.category,
        deadline=task_data.deadline,
        status=TaskStatus.PENDING,
        progress=0,
    )

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return TaskResponse(
        id=str(task.id),
        student_id=str(task.student_id),
        title=task.title,
        description=task.description,
        category=task.category,
        deadline=task.deadline.isoformat() if task.deadline else None,
        status=task.status.value,
        progress=task.progress,
        created_at=task.created_at.isoformat(),
        updated_at=task.updated_at.isoformat(),
    )


@router.put("/my/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a task."""
    result = await db.execute(
        select(Task).where(
            (Task.id == task_id) & (Task.student_id == current_user["id"])
        )
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Update fields
    if task_data.title is not None:
        task.title = task_data.title
    if task_data.description is not None:
        task.description = task_data.description
    if task_data.progress is not None:
        task.progress = max(0, min(100, task_data.progress))
    if task_data.status is not None:
        try:
            task.status = TaskStatus(task_data.status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {[s.value for s in TaskStatus]}",
            )

    await db.commit()
    await db.refresh(task)

    return TaskResponse(
        id=str(task.id),
        student_id=str(task.student_id),
        title=task.title,
        description=task.description,
        category=task.category,
        deadline=task.deadline.isoformat() if task.deadline else None,
        status=task.status.value,
        progress=task.progress,
        created_at=task.created_at.isoformat(),
        updated_at=task.updated_at.isoformat(),
    )


@router.delete("/my/tasks/{task_id}")
async def delete_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a task."""
    result = await db.execute(
        select(Task).where(
            (Task.id == task_id) & (Task.student_id == current_user["id"])
        )
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    await db.delete(task)
    await db.commit()

    return {"message": "Task deleted successfully"}


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
async def get_opportunity(
    opportunity_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific opportunity by ID."""
    try:
        result = await db.execute(
            select(Opportunity)
            .options(selectinload(Opportunity.faculty))
            .where(Opportunity.id == opportunity_id)
        )
        opportunity = result.scalar_one_or_none()

        if not opportunity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Opportunity not found",
            )

        # Check if current user has applied
        is_applied = False
        application_status = None

        if current_user["role"] == "STUDENT":
            app_result = await db.execute(
                select(Application).where(
                    (Application.opportunity_id == opportunity_id)
                    & (Application.student_id == current_user["id"])
                )
            )
            application = app_result.scalar_one_or_none()
            if application:
                is_applied = True
                application_status = application.status.value if hasattr(application.status, "value") else str(application.status)

        return OpportunityResponse(
            id=str(opportunity.id),
            title=str(opportunity.title),
            description=str(opportunity.description),
            type=str(opportunity.type.value)
            if hasattr(opportunity.type, "value")
            else str(opportunity.type),
            faculty_id=str(opportunity.faculty_id),
            faculty_name=str(opportunity.faculty.display_name)
            if opportunity.faculty
            else "Unknown",
            skills=list(opportunity.skills) if opportunity.skills else [],
            duration=str(opportunity.duration),
            stipend=str(opportunity.stipend) if opportunity.stipend else None,
            deadline=opportunity.deadline.isoformat()
            if hasattr(opportunity.deadline, "isoformat")
            else str(opportunity.deadline),
            is_open=bool(opportunity.is_open),
            created_at=opportunity.created_at.isoformat()
            if hasattr(opportunity.created_at, "isoformat")
            else str(opportunity.created_at),
            is_applied=is_applied,
            application_status=application_status,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_opportunity: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Server Error: {str(e)}",
        )


@router.delete("/{opportunity_id}")
async def delete_opportunity(
    opportunity_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an opportunity (faculty owner or admin only)."""
    result = await db.execute(
        select(Opportunity).where(Opportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    # Only the faculty who created it or admin can delete it
    if (
        opportunity.faculty_id != current_user["id"]
        and current_user["role"] != UserRole.ADMIN.value
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this opportunity",
        )

    await db.delete(opportunity)
    await db.commit()

    return {"message": "Opportunity deleted successfully"}


@router.put("/{opportunity_id}/close")
async def close_opportunity(
    opportunity_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Close an opportunity (faculty owner only)."""
    result = await db.execute(
        select(Opportunity).where(Opportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    # Only the faculty who created it or admin can close it
    if (
        opportunity.faculty_id != current_user["id"]
        and current_user["role"] != UserRole.ADMIN.value
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to close this opportunity",
        )

    opportunity.is_open = False
    await db.commit()

    return {"message": "Opportunity closed successfully"}


@router.post("/{opportunity_id}/apply", response_model=ApplicationResponse)
async def apply_to_opportunity(
    opportunity_id: str,
    application_data: ApplicationCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apply to an opportunity (students only)."""
    # Only students can apply
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can apply to opportunities",
        )

    # Check if opportunity exists and is open
    result = await db.execute(
        select(Opportunity).where(Opportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    if not opportunity.is_open:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This opportunity is closed",
        )

    if opportunity.deadline.date() < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application deadline has passed",
        )

    # Check if already applied
    result = await db.execute(
        select(Application).where(
            (Application.opportunity_id == opportunity_id)
            & (Application.student_id == current_user["id"])
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already applied to this opportunity",
        )

    # Create application
    application = Application(
        opportunity_id=opportunity_id,
        student_id=current_user["id"],
        status=ApplicationStatus.SUBMITTED,
        cover_letter=application_data.cover_letter,
    )

    db.add(application)
    await db.commit()
    await db.refresh(application)

    # Get student and opportunity info
    student_result = await db.execute(
        select(User).where(User.id == application.student_id)
    )
    student = student_result.scalar_one_or_none()

    return ApplicationResponse(
        id=str(application.id),
        opportunity_id=str(application.opportunity_id),
        opportunity_title=opportunity.title,
        student_id=str(application.student_id),
        student_name=student.display_name if student else "Unknown",
        status=application.status.value,
        cover_letter=application.cover_letter,
        applied_at=application.applied_at.isoformat(),
    )


@router.get("/{opportunity_id}/applications", response_model=List[ApplicationResponse])
async def list_opportunity_applications(
    opportunity_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List applications for an opportunity (faculty owner only)."""
    # Check if opportunity exists
    result = await db.execute(
        select(Opportunity).where(Opportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    # Only the faculty who created it or admin can view applications
    if (
        opportunity.faculty_id != current_user["id"]
        and current_user["role"] != UserRole.ADMIN.value
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view applications",
        )

    result = await db.execute(
        select(Application)
        .options(selectinload(Application.student))
        .where(Application.opportunity_id == opportunity_id)
        .order_by(desc(Application.applied_at))
    )
    applications = result.scalars().all()

    return [
        ApplicationResponse(
            id=str(app.id),
            opportunity_id=str(app.opportunity_id),
            opportunity_title=opportunity.title,
            student_id=str(app.student_id),
            student_name=app.student.display_name if app.student else "Unknown",
            status=app.status.value,
            cover_letter=app.cover_letter,
            applied_at=app.applied_at.isoformat(),
        )
        for app in applications
    ]


@router.put("/applications/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: str,
    status_update: ApplicationStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update application status (faculty owner only)."""
    # Get application with opportunity
    result = await db.execute(
        select(Application)
        .options(
            selectinload(Application.opportunity), selectinload(Application.student)
        )
        .where(Application.id == application_id)
    )
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    # Only the faculty who owns the opportunity or admin can update status
    if (
        application.opportunity.faculty_id != current_user["id"]
        and current_user["role"] != UserRole.ADMIN.value
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update application status",
        )

    # Validate status
    try:
        new_status = ApplicationStatus(status_update.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {[s.value for s in ApplicationStatus]}",
        )

    application.status = new_status
    await db.commit()

    return ApplicationResponse(
        id=str(application.id),
        opportunity_id=str(application.opportunity_id),
        opportunity_title=application.opportunity.title,
        student_id=str(application.student_id),
        student_name=application.student.display_name
        if application.student
        else "Unknown",
        status=application.status.value,
        cover_letter=application.cover_letter,
        applied_at=application.applied_at.isoformat(),
    )



