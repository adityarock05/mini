from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.academic import (
    Course,
    Enrollment,
    Resource,
    ResourceType,
    CalendarEvent,
)
from app.models.user import User, UserRole
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/courses", tags=["Academics"])


# Schemas
class CourseResponse(BaseModel):
    id: str
    code: str
    name: str
    credits: int
    semester: str
    department: str
    description: Optional[str]
    professor_id: Optional[str]
    professor_name: Optional[str]
    enrollment_count: int
    is_enrolled: bool = False
    created_at: str

    class Config:
        from_attributes = True


class CourseCreate(BaseModel):
    code: str
    name: str
    credits: int
    semester: str
    department: str
    description: Optional[str] = None


class EnrollmentResponse(BaseModel):
    id: str
    course_id: str
    course_name: str
    course_code: str
    semester: str
    attendance_count: int
    total_classes: int
    enrolled_at: Optional[str] = None

    class Config:
        from_attributes = True


class ResourceResponse(BaseModel):
    id: str
    course_id: str
    title: str
    type: str
    year: Optional[int]
    exam_type: Optional[str]
    file_path: Optional[str]
    tags: List[str]
    downloads: int
    uploader_name: str
    created_at: str

    class Config:
        from_attributes = True


class ResourceCreate(BaseModel):
    title: str
    type: str  # PAPER, NOTES, OTHER
    year: Optional[int] = None
    exam_type: Optional[str] = None
    tags: List[str] = []


class CalendarEventResponse(BaseModel):
    id: str
    course_id: Optional[str]
    title: str
    description: Optional[str]
    event_type: str
    start_date: str
    end_date: Optional[str]
    created_by: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[CourseResponse])
async def list_courses(
    department: Optional[str] = None,
    semester: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all courses with optional filters."""
    query = select(Course).options(selectinload(Course.professor))

    if department:
        query = query.where(Course.department == department)
    if semester:
        query = query.where(Course.semester == semester)

    result = await db.execute(query.offset(skip).limit(limit))
    courses = result.scalars().all()

    response_list = []
    for course in courses:
        # Get enrollment count
        enrollment_result = await db.execute(
            select(Enrollment).where(Enrollment.course_id == course.id)
        )
        enrollment_count = len(enrollment_result.scalars().all())

        # Check if current user is enrolled
        is_enrolled = False
        if current_user["role"] in [UserRole.STUDENT.value, UserRole.FACULTY.value]:
             user_enrollment = await db.execute(
                select(Enrollment).where(
                    (Enrollment.student_id == current_user["id"])
                    & (Enrollment.course_id == course.id)
                )
            )
             is_enrolled = user_enrollment.scalar_one_or_none() is not None

        response_list.append(
            CourseResponse(
                id=str(course.id),
                code=course.code,
                name=course.name,
                credits=course.credits,
                semester=course.semester,
                department=course.department,
                description=course.description,
                professor_id=str(course.professor_id) if course.professor_id else None,
                professor_name=course.professor.display_name
                if course.professor
                else None,
                enrollment_count=enrollment_count,
                is_enrolled=is_enrolled,
                created_at=course.created_at.isoformat(),
            )
        )

    return response_list


@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    course_data: CourseCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new course (faculty/admin only)."""
    # Only faculty and admin can create courses
    if current_user["role"] not in [UserRole.FACULTY.value, UserRole.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty or admin can create courses",
        )

    # Check if course code already exists
    result = await db.execute(select(Course).where(Course.code == course_data.code))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course code already exists",
        )

    # Create course
    course = Course(
        code=course_data.code,
        name=course_data.name,
        credits=course_data.credits,
        semester=course_data.semester,
        department=course_data.department,
        description=course_data.description,
        professor_id=current_user["id"]
        if current_user["role"] == UserRole.FACULTY.value
        else None,
    )

    db.add(course)
    await db.commit()
    await db.refresh(course)

    # Check if current user is enrolled
    is_enrolled = False
    if current_user["role"] in [UserRole.STUDENT.value, UserRole.FACULTY.value]:
        user_enrollment = await db.execute(
            select(Enrollment).where(
                (Enrollment.student_id == current_user["id"])
                & (Enrollment.course_id == course.id)
            )
        )
        is_enrolled = user_enrollment.scalar_one_or_none() is not None

    return CourseResponse(
        id=str(course.id),
        code=course.code,
        name=course.name,
        credits=course.credits,
        semester=course.semester,
        department=course.department,
        description=course.description,
        professor_id=str(course.professor_id) if course.professor_id else None,
        professor_name=None,
        enrollment_count=0,
        created_at=course.created_at.isoformat(),
    )


@router.get("/my/enrollments", response_model=List[EnrollmentResponse])
async def list_my_enrollments(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's course enrollments."""
    result = await db.execute(
        select(Enrollment)
        .options(selectinload(Enrollment.course))
        .where(Enrollment.student_id == current_user["id"])
    )
    enrollments = result.scalars().all()

    return [
        EnrollmentResponse(
            id=str(enrollment.id),
            course_id=str(enrollment.course_id),
            course_name=enrollment.course.name,
            course_code=enrollment.course.code,
            semester=enrollment.semester,
            attendance_count=enrollment.attendance_count,
            total_classes=enrollment.total_classes,
            enrolled_at=enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
        )
        for enrollment in enrollments
    ]


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific course by ID (enrolled students, professor, or admin only)."""
    result = await db.execute(
        select(Course)
        .options(selectinload(Course.professor))
        .where(Course.id == course_id)
    )
    course = result.scalar_one_or_none()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    try:
        # Access control: Allow any authenticated user to view course details
        # The frontend will handle showing/hiding Enroll/Add Resource buttons based on role/enrollment status
        
        # Check access: must be professor, enrolled student, or admin
        # is_professor = str(course.professor_id) == current_user["id"]
        # is_admin = current_user["role"] == UserRole.ADMIN.value

        # # Check if student is enrolled
        # is_enrolled = False
        # if current_user["role"] == UserRole.STUDENT.value:
        #     enrollment_result = await db.execute(
        #         select(Enrollment).where(
        #             (Enrollment.student_id == current_user["id"])
        #             & (Enrollment.course_id == course_id)
        #         )
        #     )
        #     is_enrolled = enrollment_result.scalar_one_or_none() is not None

        # if not (is_professor or is_enrolled or is_admin):
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="You must be enrolled in this course to view details",
        #     )

        # Get enrollment count
        enrollment_result = await db.execute(
            select(Enrollment).where(Enrollment.course_id == course.id)
        )
        enrollment_count = len(enrollment_result.scalars().all())

        # Check if current user is enrolled
        is_enrolled = False
        if current_user["role"] in [UserRole.STUDENT.value, UserRole.FACULTY.value]:
             user_enrollment = await db.execute(
                select(Enrollment).where(
                    (Enrollment.student_id == current_user["id"])
                    & (Enrollment.course_id == course.id)
                )
            )
             is_enrolled = user_enrollment.scalar_one_or_none() is not None

        return CourseResponse(
            id=str(course.id),
            code=str(course.code),
            name=str(course.name),
            credits=course.credits,
            semester=str(course.semester),
            department=str(course.department),
            description=str(course.description) if course.description else None,
            professor_id=str(course.professor_id) if course.professor_id else None,
            professor_name=str(course.professor.display_name) if course.professor else None,
            enrollment_count=enrollment_count,
            is_enrolled=is_enrolled,
            created_at=course.created_at.isoformat()
            if hasattr(course.created_at, "isoformat")
            else str(course.created_at),
        )
    except Exception as e:
        print(f"Error in get_course: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Server Error: {str(e)}",
        )


@router.post("/{course_id}/enroll")
async def enroll_in_course(
    course_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Enroll current user in a course."""
    # Valid roles: Student and Faculty
    if current_user["role"] not in [UserRole.STUDENT.value, UserRole.FACULTY.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students and faculty can enroll in courses",
        )

    # Check if course exists
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    # Check if already enrolled
    result = await db.execute(
        select(Enrollment).where(
            (Enrollment.student_id == current_user["id"])
            & (Enrollment.course_id == course_id)
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already enrolled in this course",
        )

    # Create enrollment
    enrollment = Enrollment(
        student_id=current_user["id"],
        course_id=course_id,
        semester=course.semester,
        attendance_count=0,
        total_classes=0,
    )

    db.add(enrollment)
    await db.commit()

    return {"message": "Successfully enrolled in course"}


@router.get("/{course_id}/resources", response_model=List[ResourceResponse])
async def list_course_resources(
    course_id: str,
    resource_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List resources for a course."""
    query = (
        select(Resource)
        .options(selectinload(Resource.uploader))
        .where(Resource.course_id == course_id)
    )

    if resource_type:
        try:
            res_type = ResourceType(resource_type)
            query = query.where(Resource.type == res_type)
        except ValueError:
            pass

    result = await db.execute(query.order_by(desc(Resource.created_at)))
    resources = result.scalars().all()

    return [
        ResourceResponse(
            id=str(resource.id),
            course_id=str(resource.course_id),
            title=resource.title,
            type=resource.type.value,
            year=resource.year,
            exam_type=resource.exam_type,
            file_path=resource.file_path,
            tags=resource.tags or [],
            downloads=resource.downloads,
            uploader_name=resource.uploader.display_name
            if resource.uploader
            else "Unknown",
            created_at=resource.created_at.isoformat(),
        )
        for resource in resources
    ]


@router.post("/{course_id}/resources", response_model=ResourceResponse)
async def create_resource(
    course_id: str,
    resource_data: ResourceCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a resource for a course (professor only)."""
    # Check if course exists
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    # Only course professor or admin can upload resources
    if (
        str(course.professor_id) != current_user["id"]
        and current_user["role"] != UserRole.ADMIN.value
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the course professor can upload resources",
        )

    # Validate resource type
    try:
        res_type = ResourceType(resource_data.type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type. Must be one of: {[t.value for t in ResourceType]}",
        )

    # Create resource
    resource = Resource(
        course_id=course_id,
        uploader_id=current_user["id"],
        type=res_type,
        title=resource_data.title,
        year=resource_data.year,
        exam_type=resource_data.exam_type,
        tags=resource_data.tags,
        downloads=0,
    )

    db.add(resource)
    await db.commit()
    await db.refresh(resource)

    # Get uploader
    uploader_result = await db.execute(
        select(User).where(User.id == resource.uploader_id)
    )
    uploader = uploader_result.scalar_one_or_none()

    return ResourceResponse(
        id=str(resource.id),
        course_id=str(resource.course_id),
        title=str(resource.title),
        type=str(resource.type.value)
        if hasattr(resource.type, "value")
        else str(resource.type),
        year=resource.year,
        exam_type=str(resource.exam_type) if resource.exam_type else None,
        file_path=str(resource.file_path) if resource.file_path else None,
        tags=list(resource.tags) if resource.tags else [],
        downloads=resource.downloads,
        uploader_name=str(uploader.display_name) if uploader else "Unknown",
        created_at=resource.created_at.isoformat(),
    )


@router.get("/{course_id}/calendar", response_model=List[CalendarEventResponse])
async def list_course_calendar(
    course_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List calendar events for a course."""
    result = await db.execute(
        select(CalendarEvent)
        .where(CalendarEvent.course_id == course_id)
        .order_by(CalendarEvent.start_date)
    )
    events = result.scalars().all()

    return [
        CalendarEventResponse(
            id=str(event.id),
            course_id=str(event.course_id) if event.course_id else None,
            title=event.title,
            description=event.description,
            event_type=event.event_type,
            start_date=event.start_date.isoformat(),
            end_date=event.end_date.isoformat() if event.end_date else None,
            created_by=str(event.created_by),
        )
        for event in events
    ]



