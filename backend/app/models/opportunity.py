import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    Integer,
    Boolean,
    Enum as SQLEnum,
)
from sqlalchemy import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum


class ApplicationStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    SHORTLISTED = "SHORTLISTED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class OpportunityType(str, enum.Enum):
    RESEARCH = "RESEARCH"
    INTERNSHIP = "INTERNSHIP"


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    faculty_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    type = Column(
        SQLEnum(OpportunityType), default=OpportunityType.RESEARCH, nullable=False
    )
    skills = Column(JSON, default=[])
    duration = Column(String(100), nullable=False)
    stipend = Column(String(100), nullable=True)
    deadline = Column(DateTime, nullable=False)
    is_open = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    faculty = relationship("User", back_populates="opportunities")
    applications = relationship("Application", back_populates="opportunity")


class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id = Column(
        UUID(as_uuid=True), ForeignKey("opportunities.id"), nullable=False
    )
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(
        SQLEnum(ApplicationStatus), default=ApplicationStatus.SUBMITTED, nullable=False
    )
    resume_path = Column(String(500), nullable=True)
    cover_letter = Column(Text, nullable=True)
    applied_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    opportunity = relationship("Opportunity", back_populates="applications")
    student = relationship("User", back_populates="applications")


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    deadline = Column(DateTime, nullable=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    student = relationship("User", back_populates="tasks")
