import asyncio
import httpx
from main import app

async def test():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        payload = {'email': 'student1@students.pesce.ac.in', 'password': 'password123'}
        resp = await client.post('/api/v1/auth/login', json=payload)
        print("Login status:", resp.status_code)
        
        if resp.status_code == 200:
            token = resp.json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            resp2 = await client.get('/api/v1/users/me', headers=headers)
            print("Users Me status:", resp2.status_code)
            print("Users Me body:", resp2.text)

asyncio.run(test())
