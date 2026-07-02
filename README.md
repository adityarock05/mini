# AEGIS Platform - IIT Mandi Campus Management System

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-blue)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-green)](https://fastapi.tiangolo.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-blue)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A unified digital platform for IIT Mandi that brings together students, faculty, and administration through four core pillars: Identity & Governance, Voice (Grievance System), Fate (Academic Hub), and Opportunity (Career Portal).

## 🎯 Features

### Four Core Pillars

**🏛️ Pillar I: Identity & Governance**
- Role-based authentication (Student, Faculty, Authority, Admin)
- JWT-based secure authentication with refresh tokens
- Email domain validation (@students.iitmandi.ac.in vs @iitmandi.ac.in)
- Profile management with department selection
- Admin user management and role assignment

**📢 Pillar II: Voice - Grievance System**
- Submit grievances with anonymous option
- Status tracking (Submitted → Under Review → In Progress → Resolved)
- Timeline view with updates and remarks
- Authority can manage all grievances across institute
- Photo upload support

**📚 Pillar III: Fate - Academic Hub**
- Course browsing and enrollment
- Professor-only resource upload
- Enrollment-based access control
- Academic calendar events
- Department and semester filtering

**💼 Pillar IV: Opportunity**
- Faculty/Authority can post opportunities (Research/Internship)
- Student applications with status tracking
- Task Manager (Scholar's Ledger) with full CRUD
- Application management by opportunity owners

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd krkhc
```

2. **Start Infrastructure**
```bash
docker-compose up -d
```

3. **Setup Backend**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install uv
uv sync
python init_db.py
python init_db.py

# Method 1: Using start script
./start.sh

# Method 2: Manual Start (using uv)
# Ensure DATABASE_URL is set in .env or exported
uv run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Method 3: Standard Python (using venv)
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```

4. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 📁 Project Structure

```
krkhc/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/               # API routes
│   │   ├── core/              # Config, security, deps
│   │   ├── models/            # SQLAlchemy models
│   │   └── db/                # Database configuration
│   ├── main.py                # FastAPI entry point
│   ├── seed.py                # Database seeding script
│   └── pyproject.toml         # Python dependencies
├── frontend/                   # Next.js Frontend
│   ├── app/                   # Next.js app router
│   ├── components/            # React components
│   ├── lib/                   # Utilities and API client
│   └── stores/                # Zustand state management
├── docker-compose.yml         # Docker services
└── PROJECT_STATUS.md          # Detailed project documentation
```

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## 👥 Test Accounts

All accounts use password: `password123`

| Role | Email | Department |
|------|-------|------------|
| Faculty | faculty1@iitmandi.ac.in | Computer Science |
| Faculty | faculty2@iitmandi.ac.in | Electrical Engineering |
| Authority | authority1@iitmandi.ac.in | Computer Science |
| Authority | authority2@iitmandi.ac.in | Mechanical Engineering |
| Student | student1@students.iitmandi.ac.in | Computer Science |
| Student | student2@students.iitmandi.ac.in | Electrical Engineering |
| Admin | admin@iitmandi.ac.in | Computer Science |

**Seed the database:**
```bash
cd backend
python seed.py
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Zustand** - State management
- **Axios** - HTTP client

### Backend
- **FastAPI** - Python web framework
- **SQLAlchemy 2.0** - ORM
- **PostgreSQL** - Database
- **asyncpg** - Async PostgreSQL driver
- **Redis** - Session storage
- **JWT** - Authentication

## 📝 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚢 Deployment

### Railway (Backend)
1. Connect your GitHub repo to Railway
2. Add PostgreSQL service
3. Set environment variables
4. Deploy automatically on push

### Vercel (Frontend)
1. Connect your GitHub repo to Vercel
2. Set environment variables
3. Deploy automatically on push

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For issues and feature requests, please use the GitHub issue tracker.

## 🎉 Acknowledgments

- IIT Mandi for the project requirements
- FastAPI and Next.js communities for excellent documentation
- All contributors who helped build this platform

---

**Version**: 1.0.0  
**Last Updated**: February 15, 2026  
**Status**: Production Ready ✅
