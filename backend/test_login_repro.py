
import asyncio
import httpx

async def test_login():
    url = "http://localhost:8000/api/v1/auth/login"
    # Credentials from seed.py (assuming password123 as per README)
    payload = {
        "email": "student1@students.pesce.ac.in",
        "password": "password123"
    }
    
    print(f"Attempting login to {url} with {payload['email']}...")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("Login SUCCESS!")
        else:
            print("Login FAILED!")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_login())
