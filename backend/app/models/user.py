import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    FACULTY = "FACULTY"
    AUTHORITY = "AUTHORITY"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.STUDENT, nullable=False)
    display_name = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Pillar II: Voice - Grievances
    grievances = relationship("Grievance", back_populates="submitter")
    grievance_updates = relationship("GrievanceUpdate", back_populates="updater")

    # Pillar III: Fate - Academics
    taught_courses = relationship("Course", back_populates="professor")
    enrollments = relationship("Enrollment", back_populates="student")
    resources = relationship("Resource", back_populates="uploader")

    # Pillar IV: Opportunity
    opportunities = relationship("Opportunity", back_populates="faculty")
    applications = relationship("Application", back_populates="student")
    tasks = relationship("Task", back_populates="student")
