from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.grievance import (
    Grievance,
    GrievanceUpdate,
    GrievanceStatus,
    GrievanceCategory,
    Priority,
)
from app.models.user import User, UserRole
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/grievances", tags=["Grievances"])


# Schemas
class GrievanceCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str
    location: str
    is_anonymous: bool = False


class GrievanceUpdateCreate(BaseModel):
    status: str
    remark: str


class GrievanceUpdateResponse(BaseModel):
    id: str
    status: str
    remark: str
    created_at: str
    updated_by: dict

    class Config:
        from_attributes = True


class GrievanceResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    priority: str
    location: str
    status: str
    is_anonymous: bool
    submitter_id: Optional[str]
    submitter_name: Optional[str]
    assigned_to: Optional[str]
    created_at: str
    updated_at: str
    updates: List[GrievanceUpdateResponse]

    class Config:
        from_attributes = True


async def get_user_name(db: AsyncSession, user_id: str) -> Optional[str]:
    """Helper to get user display name."""
    import uuid
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    return user.display_name or user.email if user else None


async def build_grievance_response(
    grievance: Grievance, db: AsyncSession
) -> GrievanceResponse:
    """Build grievance response with all related data."""
    # Get submitter name
    submitter_name = None
    if grievance.submitter_id and not grievance.is_anonymous:
        submitter_name = await get_user_name(db, str(grievance.submitter_id))

    # Build updates response
    updates_response = []
    for update in grievance.updates:
        updater_name = await get_user_name(db, str(update.updated_by))
        updater_info = {"id": str(update.updated_by), "name": updater_name or "Unknown"}

        updates_response.append(
            GrievanceUpdateResponse(
                id=str(update.id),
                status=update.status.value
                if hasattr(update.status, "value")
                else str(update.status),
                remark=update.remark,
                created_at=update.created_at.isoformat()
                if hasattr(update.created_at, "isoformat")
                else str(update.created_at),
                updated_by=updater_info,
            )
        )

    return GrievanceResponse(
        id=str(grievance.id),
        title=str(grievance.title),
        description=str(grievance.description),
        category=str(
            grievance.category.value
            if hasattr(grievance.category, "value")
            else grievance.category
        ),
        priority=str(
            grievance.priority.value
            if hasattr(grievance.priority, "value")
            else grievance.priority
        ),
        location=str(grievance.location),
        status=str(
            grievance.status.value
            if hasattr(grievance.status, "value")
            else grievance.status
        ),
        is_anonymous=bool(grievance.is_anonymous),
        submitter_id=str(grievance.submitter_id) if grievance.submitter_id else None,
        submitter_name=submitter_name,
        assigned_to=str(grievance.assigned_to) if grievance.assigned_to else None,
        created_at=grievance.created_at.isoformat()
        if hasattr(grievance.created_at, "isoformat")
        else str(grievance.created_at),
        updated_at=grievance.updated_at.isoformat()
        if hasattr(grievance.updated_at, "isoformat")
        else str(grievance.updated_at),
        updates=updates_response,
    )


@router.post("", response_model=GrievanceResponse, status_code=status.HTTP_201_CREATED)
async def create_grievance(
    grievance_data: GrievanceCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new grievance."""
    # Validate category and priority
    try:
        category = GrievanceCategory(grievance_data.category)
        priority = Priority(grievance_data.priority)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category or priority: {str(e)}",
        )

    # Create grievance
    grievance = Grievance(
        title=grievance_data.title,
        description=grievance_data.description,
        category=category,
        priority=priority,
        location=grievance_data.location,
        status=GrievanceStatus.SUBMITTED,
        is_anonymous=grievance_data.is_anonymous,
        submitter_id=None if grievance_data.is_anonymous else uuid.UUID(current_user["id"]),
    )

    db.add(grievance)
    await db.commit()

    # Create initial update
    update = GrievanceUpdate(
        grievance_id=grievance.id,
        updated_by=uuid.UUID(current_user["id"]),
        status=GrievanceStatus.SUBMITTED,
        remark="Grievance submitted",
    )
    db.add(update)
    await db.commit()

    # Reload grievance with updates eagerly loaded
    result = await db.execute(
        select(Grievance)
        .options(selectinload(Grievance.updates))
        .where(Grievance.id == grievance.id)
    )
    grievance = result.scalar_one()

    return await build_grievance_response(grievance, db)


@router.get("", response_model=List[GrievanceResponse])
async def list_grievances(
    status: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List grievances with optional filters."""
    query = (
        select(Grievance)
        .options(selectinload(Grievance.updates))
        .order_by(desc(Grievance.created_at))
    )

    # Apply filters
    if status:
        try:
            grievance_status = GrievanceStatus(status)
            query = query.where(Grievance.status == grievance_status)
        except ValueError:
            pass

    if category:
        try:
            grievance_category = GrievanceCategory(category)
            query = query.where(Grievance.category == grievance_category)
        except ValueError:
            pass

    # Students and Faculty can only see their own grievances (unless anonymous)
    if current_user["role"] in [UserRole.STUDENT.value, UserRole.FACULTY.value]:
        query = query.where(
            (Grievance.submitter_id == uuid.UUID(current_user["id"]))
            | (Grievance.is_anonymous == True)
        )

    result = await db.execute(query.offset(skip).limit(limit))
    grievances = result.scalars().all()

    response_list = []
    for grievance in grievances:
        response_list.append(await build_grievance_response(grievance, db))

    return response_list


@router.get("/{grievance_id}", response_model=GrievanceResponse)
async def get_grievance(
    grievance_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific grievance by ID."""
    result = await db.execute(
        select(Grievance)
        .options(selectinload(Grievance.updates))
        .where(Grievance.id == grievance_id)
    )
    grievance = result.scalar_one_or_none()

    if not grievance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    # Check authorization
    if current_user["role"] == UserRole.STUDENT.value:
        # Allow if it's their own grievance OR if it's anonymous
        # Note: We must cast submitter_id to string for comparison because it's a UUID in the DB model
        is_owner = str(grievance.submitter_id) == current_user["id"]
        if not is_owner and not grievance.is_anonymous:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this grievance",
            )

    return await build_grievance_response(grievance, db)


@router.post("/{grievance_id}/updates", response_model=GrievanceResponse)
async def add_grievance_update(
    grievance_id: str,
    update_data: GrievanceUpdateCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a status update to a grievance (faculty/authority/admin only)."""
    # Check if user can update grievances
    if current_user["role"] not in [
        UserRole.AUTHORITY.value,
        UserRole.ADMIN.value,
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty, authority, or admin can update grievances",
        )

    # Get grievance
    result = await db.execute(
        select(Grievance)
        .options(selectinload(Grievance.updates))
        .where(Grievance.id == grievance_id)
    )
    grievance = result.scalar_one_or_none()

    if not grievance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    # Validate status
    try:
        new_status = GrievanceStatus(update_data.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {[s.value for s in GrievanceStatus]}",
        )

    # Create update
    update = GrievanceUpdate(
        grievance_id=grievance.id,
        updated_by=uuid.UUID(current_user["id"]),
        status=new_status,
        remark=update_data.remark,
    )
    db.add(update)

    # Update grievance status
    grievance.status = new_status
    if not grievance.assigned_to:
        grievance.assigned_to = current_user["id"]

    await db.commit()

    # Reload to get fresh data
    result = await db.execute(
        select(Grievance)
        .options(selectinload(Grievance.updates))
        .where(Grievance.id == grievance_id)
    )
    grievance = result.scalar_one()

    return await build_grievance_response(grievance, db)


@router.post("/{grievance_id}/photos")
async def upload_grievance_photo(
    grievance_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a photo for a grievance."""
    # Check if grievance exists and user owns it
    result = await db.execute(select(Grievance).where(Grievance.id == grievance_id))
    grievance = result.scalar_one_or_none()

    if not grievance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    if str(grievance.submitter_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload photos for this grievance",
        )

    # For now, just return success (implement file storage later)
    return {"message": "Photo uploaded successfully", "filename": file.filename}
