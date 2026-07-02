from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.core.config import get_settings
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token, RefreshToken
from app.db.database import get_db
from app.models.user import User, UserRole

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()
settings = get_settings()


def is_valid_student_email(email: str) -> bool:
    """Check if email is from students domain."""
    return email.endswith("@students.pesce.ac.in") or email.endswith("@gmail.com")


def is_valid_staff_email(email: str) -> bool:
    """Check if email is from staff domain."""
    return email.endswith("@pesce.ac.in")


def validate_email_for_role(email: str, role: str) -> bool:
    """Validate email domain based on role.

    STUDENT: @students.pesce.ac.in
    FACULTY/AUTHORITY/ADMIN: @pesce.ac.in
    """
    if role == "STUDENT":
        return is_valid_student_email(email)
    else:
        return is_valid_staff_email(email)


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user with institute email validation."""
    # Prevent self-registration as ADMIN
    # ADMIN role can only be assigned by existing admins via user management API
    if user_data.role == "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ADMIN role cannot be self-assigned. Contact an existing admin for role promotion.",
        )

    # Validate institute email based on role
    if not validate_email_for_role(user_data.email, user_data.role):
        if user_data.role == "STUDENT":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Students must use @students.pesce.ac.in or @gmail.com email addresses",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Faculty, Authority, and Admin must use @pesce.ac.in email addresses",
            )

    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email.lower()))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Hash password
    hashed_password = get_password_hash(user_data.password)

    # Create user
    user = User(
        email=user_data.email.lower(),
        password_hash=hashed_password,
        role=UserRole(user_data.role),
        display_name=user_data.display_name,
        department=user_data.department,
        avatar_url=user_data.avatar_url,
        is_active=True,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return UserResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        department=user.department,
        avatar_url=user.avatar_url,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT tokens."""
    # Find user
    result = await db.execute(select(User).where(User.email == credentials.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    # Create tokens
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: RefreshToken, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    payload = verify_token(token_data.refresh_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    import uuid
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create new tokens
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/logout")
async def logout(token_data: RefreshToken):
    """Logout user by blacklisting refresh token."""
    # In a production system, you would add the token to a Redis blacklist
    # For now, we'll just return success as client-side should clear cookies
    return {"message": "Successfully logged out"}
