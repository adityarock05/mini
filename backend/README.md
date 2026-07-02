# AEGIS Platform Backend

## Quick Start

### Prerequisites
- Python 3.14+
- uv (Python package manager)
- Docker & Docker Compose (for PostgreSQL and Redis)

### Installation

```bash
# Install dependencies
uv sync

# Initialize database (make sure Docker containers are running)
uv run python init_db.py
```

### Running the Server

```bash
# Development server with hot reload
uv run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or using the script
./.venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Environment Variables

Create a `.env` file:
```env
DATABASE_URL=postgresql+asyncpg://aegis_user:aegis_password@localhost:5432/aegis_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### Docker Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Stop services
docker-compose down
```

### API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Project Structure

```
backend/
├── app/
│   ├── core/          # Config, security, dependencies
│   ├── models/        # SQLAlchemy models
│   ├── schemas/       # Pydantic schemas
│   └── api/           # API routes
├── main.py            # FastAPI application entry
├── init_db.py         # Database initialization
└── pyproject.toml     # uv project configuration
```