
import asyncio
import sys
from sqlalchemy import select
from app.db.database import get_db
from app.models.user import User

async def check_users():
    print("Checking for users in database...")
    async for db in get_db():
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        print(f"Found {len(users)} users.")
        for user in users:
            print(f"- {user.email} (Role: {user.role.value})")
            
        if len(users) == 0:
            print("\nWARNING: No users found! You need to run seed.py.")
            sys.exit(1)
        else:
             print("\nUsers exist. Login should work with correct password.")

if __name__ == "__main__":
    asyncio.run(check_users())
