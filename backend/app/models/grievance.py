import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    DateTime,
    Boolean,
    Enum as SQLEnum,
    Integer,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum


class GrievanceCategory(str, enum.Enum):
    INFRASTRUCTURE = "INFRASTRUCTURE"
    ACADEMICS = "ACADEMICS"
    HOSTEL = "HOSTEL"
    FOOD = "FOOD"
    OTHER = "OTHER"


class Priority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class GrievanceStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class Grievance(Base):
    __tablename__ = "grievances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submitter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    category = Column(SQLEnum(GrievanceCategory), nullable=False)
    priority = Column(SQLEnum(Priority), nullable=False)
    location = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(
        SQLEnum(GrievanceStatus), default=GrievanceStatus.SUBMITTED, nullable=False
    )
    is_anonymous = Column(Boolean, default=False, nullable=False)
    photos = Column(JSON, default=[])
    assigned_to = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    submitter = relationship("User", back_populates="grievances")
    updates = relationship(
        "GrievanceUpdate", back_populates="grievance", cascade="all, delete-orphan"
    )


class GrievanceUpdate(Base):
    __tablename__ = "grievance_updates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grievance_id = Column(
        UUID(as_uuid=True), ForeignKey("grievances.id"), nullable=False
    )
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(SQLEnum(GrievanceStatus), nullable=False)
    remark = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    grievance = relationship("Grievance", back_populates="updates")
    updater = relationship("User", back_populates="grievance_updates")
