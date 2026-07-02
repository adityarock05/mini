import httpx
import asyncio

async def main():
    url = 'http://localhost:8000/api/v1/auth/login'
    payload = {'email': 'student1@students.pesce.ac.in', 'password': 'password123'}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload)
        token = resp.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        resp2 = await client.get('http://localhost:8000/api/v1/users/me', headers=headers)
        print(resp2.status_code, resp2.text)

asyncio.run(main())
