import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    DateTime,
    Integer,
    ForeignKey,
    Text,
    JSON,
    Enum as SQLEnum,
)
from sqlalchemy import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum


class ResourceType(str, enum.Enum):
    PAPER = "PAPER"
    NOTES = "NOTES"
    OTHER = "OTHER"


class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    credits = Column(Integer, nullable=False)
    semester = Column(String(50), nullable=False)
    professor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    department = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    professor = relationship("User", back_populates="taught_courses")
    enrollments = relationship("Enrollment", back_populates="course")
    resources = relationship("Resource", back_populates="course")
    events = relationship("CalendarEvent", back_populates="course")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    semester = Column(String(50), nullable=False)
    attendance_count = Column(Integer, default=0, nullable=False)
    total_classes = Column(Integer, default=0, nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

    __table_args__ = (
        # Unique constraint for student-course-semester combination
        {"sqlite_autoincrement": True},
    )


class Resource(Base):
    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(SQLEnum(ResourceType), nullable=False)
    title = Column(String(255), nullable=False)
    year = Column(Integer, nullable=False)
    exam_type = Column(String(100), nullable=True)
    file_path = Column(String(500), nullable=False)
    tags = Column(JSON, default=[])
    downloads = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    course = relationship("Course", back_populates="resources")
    uploader = relationship("User", back_populates="resources")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String(100), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    created_by = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    course = relationship("Course", back_populates="events")
