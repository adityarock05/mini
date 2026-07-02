import asyncio
from app.db.database import engine, Base
from app.models import (
    User,
    Grievance,
    GrievanceUpdate,
    Course,
    Enrollment,
    Resource,
    CalendarEvent,
    Opportunity,
    Application,
    Task,
)


async def init_db():
    """Initialize database tables."""
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")


if __name__ == "__main__":
    asyncio.run(init_db())
