import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_current_user
from app.core.storage import (
    get_file_path,
    is_allowed_file,
    validate_file_size,
    GRIEVANCE_PHOTOS_DIR,
    COURSE_RESOURCES_DIR,
    OPPORTUNITY_APPLICATIONS_DIR,
    USER_AVATARS_DIR,
    UPLOAD_DIR,
)
from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.grievance import Grievance
from app.models.academic import Course, Resource
from app.models.opportunity import Application

router = APIRouter(prefix="/files", tags=["Files"])


@router.post("/grievances/{grievance_id}/photos")
async def upload_grievance_photo(
    grievance_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a photo for a grievance."""
    # Validate file
    if not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {'.pdf, .doc, .docx, .jpg, .jpeg, .png, .gif, .mp4, .zip'}",
        )

    # Check grievance ownership
    result = await db.execute(select(Grievance).where(Grievance.id == grievance_id))
    grievance = result.scalar_one_or_none()

    if not grievance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Grievance not found"
        )

    if str(grievance.submitter_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload photos for this grievance",
        )

    # Generate unique filename
    ext = Path(file.filename).suffix
    filename = f"{uuid.uuid4()}{ext}"
    file_path = GRIEVANCE_PHOTOS_DIR / filename

    # Save file
    content = await file.read()
    if not validate_file_size(len(content)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: 10MB",
        )

    with open(file_path, "wb") as f:
        f.write(content)

    # Update grievance photos array
    if not grievance.photos:
        grievance.photos = []
    grievance.photos.append(f"/uploads/grievances/{filename}")
    await db.commit()

    return {
        "message": "Photo uploaded successfully",
        "filename": filename,
        "url": f"/uploads/grievances/{filename}",
    }


@router.post("/courses/{course_id}/resources")
async def upload_course_resource(
    course_id: str,
    file: UploadFile = File(...),
    title: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a resource file for a course (professor only)."""
    # Validate file
    if not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"File type not allowed"
        )

    # Check course ownership
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    if (
        str(course.professor_id) != current_user["id"]
        and current_user["role"] != UserRole.ADMIN.value
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the course professor can upload resources",
        )

    # Generate unique filename
    ext = Path(file.filename).suffix
    filename = f"{uuid.uuid4()}{ext}"
    file_path = COURSE_RESOURCES_DIR / filename

    # Save file
    content = await file.read()
    if not validate_file_size(len(content)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File too large"
        )

    with open(file_path, "wb") as f:
        f.write(content)

    # Create resource record
    resource = Resource(
        course_id=course_id,
        uploader_id=current_user["id"],
        title=title or file.filename,
        file_path=f"/uploads/courses/{filename}",
        type="OTHER",  # Can be made more specific
        downloads=0,
    )
    db.add(resource)
    await db.commit()

    return {
        "message": "Resource uploaded successfully",
        "filename": filename,
        "url": f"/uploads/courses/{filename}",
        "resource_id": str(resource.id),
    }


@router.post("/opportunities/{opportunity_id}/applications/{application_id}/resume")
async def upload_application_resume(
    opportunity_id: str,
    application_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload resume for an application (PDF only)."""
    # Validate file type (resumes should be PDF)
    ext = Path(file.filename).suffix.lower()
    if ext != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Resume must be a PDF file"
        )

    # Check application ownership
    result = await db.execute(
        select(Application)
        .where(Application.id == application_id)
        .where(Application.opportunity_id == opportunity_id)
    )
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    if str(application.student_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload resume for this application",
        )

    # Generate unique filename
    filename = f"{uuid.uuid4()}.pdf"
    file_path = OPPORTUNITY_APPLICATIONS_DIR / filename

    # Save file
    content = await file.read()
    if not validate_file_size(len(content)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File too large"
        )

    with open(file_path, "wb") as f:
        f.write(content)

    # Update application
    application.resume_path = f"/uploads/opportunities/{filename}"
    await db.commit()

    return {
        "message": "Resume uploaded successfully",
        "filename": filename,
        "url": f"/uploads/opportunities/{filename}",
    }


@router.post("/users/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload user avatar (image files only)."""
    # Validate file type
    ext = Path(file.filename).suffix.lower()
    allowed = {".jpg", ".jpeg", ".png", ".gif"}
    if ext not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar must be an image file (jpg, png, gif)",
        )

    # Generate unique filename
    filename = f"{current_user['id']}{ext}"
    file_path = USER_AVATARS_DIR / filename

    # Save file
    content = await file.read()
    if not validate_file_size(len(content)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File too large"
        )

    with open(file_path, "wb") as f:
        f.write(content)

    # Update user avatar_url
    import uuid
    result = await db.execute(select(User).where(User.id == uuid.UUID(current_user["id"])))
    user = result.scalar_one_or_none()
    if user:
        user.avatar_url = f"/uploads/avatars/{filename}"
        await db.commit()

    return {
        "message": "Avatar uploaded successfully",
        "url": f"/uploads/avatars/{filename}",
    }


@router.get("/uploads/{file_path:path}")
async def serve_file(file_path: str):
    """Serve uploaded files."""
    full_path = UPLOAD_DIR / file_path

    # Security check: ensure file is within upload directory
    try:
        full_path.relative_to(UPLOAD_DIR)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid file path"
        )

    if not full_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    return FileResponse(full_path)
