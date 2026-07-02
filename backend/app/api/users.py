from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["Users"])


class UserProfileResponse(BaseModel):
    id: str
    email: str
    display_name: Optional[str]
    department: Optional[str]
    avatar_url: Optional[str]
    role: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's profile."""
    import uuid
    result = await db.execute(select(User).where(User.id == uuid.UUID(current_user["id"])))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        department=user.department,
        avatar_url=user.avatar_url,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
    )


@router.put("/me", response_model=UserProfileResponse)
async def update_current_user_profile(
    profile_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile."""
    import uuid
    result = await db.execute(select(User).where(User.id == uuid.UUID(current_user["id"])))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Update fields if provided
    if profile_data.display_name is not None:
        user.display_name = profile_data.display_name
    if profile_data.department is not None:
        user.department = profile_data.department
    if profile_data.avatar_url is not None:
        user.avatar_url = profile_data.avatar_url

    await db.commit()
    await db.refresh(user)

    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        department=user.department,
        avatar_url=user.avatar_url,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
    )


@router.post("/me/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change user password."""
    from app.core.security import verify_password, get_password_hash

    import uuid
    result = await db.execute(select(User).where(User.id == uuid.UUID(current_user["id"])))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Verify current password
    if not verify_password(password_data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Hash and update new password
    user.password_hash = get_password_hash(password_data.new_password)
    await db.commit()

    return {"message": "Password changed successfully"}


@router.get("/")
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all users (admin only)."""
    from app.models.user import UserRole

    if current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()

    return [
        UserProfileResponse(
            id=str(user.id),
            email=user.email,
            display_name=user.display_name,
            department=user.department,
            avatar_url=user.avatar_url,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
        )
        for user in users
    ]


@router.put("/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user role (admin only)."""
    from app.models.user import UserRole
    from app.api.auth import validate_email_for_role

    if current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    # Validate role
    try:
        new_role = UserRole(role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}",
        )

    import uuid
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Validate email domain for new role
    if not validate_email_for_role(user.email, role):
        if role == "STUDENT":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot assign STUDENT role: {user.email} is not a student email (@students.pesce.ac.in or @gmail.com required)",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot assign {role} role: {user.email} is not a staff email (@pesce.ac.in required)",
            )

    user.role = new_role
    await db.commit()

    return {"message": f"User role updated to {role}"}
