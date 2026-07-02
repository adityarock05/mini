import asyncio
import uuid
from sqlalchemy import select
from app.db.database import get_db, SessionLocal
from app.models.user import User

async def main():
    async for db in get_db():
        # Using string
        try:
            print("Trying string...")
            user_id_str = "b78213ed-eddd-448a-886b-5ba13e6965df"
            result = await db.execute(select(User).where(User.id == user_id_str))
            print("String worked!")
        except Exception as e:
            print(f"String failed: {e}")
            
        # Using UUID
        try:
            print("Trying UUID...")
            user_id_uuid = uuid.UUID("b78213ed-eddd-448a-886b-5ba13e6965df")
            result = await db.execute(select(User).where(User.id == user_id_uuid))
            print("UUID worked!")
        except Exception as e:
            print(f"UUID failed: {e}")

asyncio.run(main())
