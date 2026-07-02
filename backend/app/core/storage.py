"""
File storage configuration for local storage.
For S3 migration, see /MIGRATE_TO_S3.md
"""

import os
from pathlib import Path
from typing import Optional

# Base storage configuration
STORAGE_TYPE = os.getenv("STORAGE_TYPE", "local")  # Options: local, s3
UPLOAD_DIR = Path(
    os.getenv("UPLOAD_DIR", "/home/apsingh/Documents/krkhc_2/backend/uploads")
)
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB default
ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".mp4",
    ".zip",
}

# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Subdirectories for different file types
GRIEVANCE_PHOTOS_DIR = UPLOAD_DIR / "grievances"
COURSE_RESOURCES_DIR = UPLOAD_DIR / "courses"
OPPORTUNITY_APPLICATIONS_DIR = UPLOAD_DIR / "opportunities"
USER_AVATARS_DIR = UPLOAD_DIR / "avatars"

# Create subdirectories
for dir_path in [
    GRIEVANCE_PHOTOS_DIR,
    COURSE_RESOURCES_DIR,
    OPPORTUNITY_APPLICATIONS_DIR,
    USER_AVATARS_DIR,
]:
    dir_path.mkdir(exist_ok=True)


def get_file_path(file_type: str, filename: str) -> Path:
    """Get the appropriate directory for a file type."""
    directories = {
        "grievance_photo": GRIEVANCE_PHOTOS_DIR,
        "course_resource": COURSE_RESOURCES_DIR,
        "opportunity_application": OPPORTUNITY_APPLICATIONS_DIR,
        "user_avatar": USER_AVATARS_DIR,
    }

    base_dir = directories.get(file_type, UPLOAD_DIR)
    return base_dir / filename


def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def validate_file_size(file_size: int) -> bool:
    """Check if file size is within limits."""
    return file_size <= MAX_FILE_SIZE
