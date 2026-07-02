import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import get_settings
from app.core.storage import UPLOAD_DIR
from app.api import auth, users, grievances, courses, opportunities, files
from app.db.database import engine, Base

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created")
    yield
    # Cleanup (if needed)


app = FastAPI(
    title=settings.app_name,
    description="AEGIS Platform - Unified Digital Citadel for PESCE",
    version="0.1.0",
    debug=settings.debug,
    lifespan=lifespan,
)

# CORS configuration - support both local dev and production
allow_origins = [
    "http://localhost:3000",  # Local development
    "https://aegis-protocol-krkhc.vercel.app",  # Production Vercel frontend
]

# Add Vercel production domains from environment variable
vercel_domains = os.getenv("CORS_ORIGINS", "")
if vercel_domains:
    # Parse comma-separated domains and strip whitespace
    domains = [domain.strip() for domain in vercel_domains.split(",") if domain.strip()]
    for domain in domains:
        if domain not in allow_origins:
            allow_origins.append(domain)
    print(f"DEBUG: Added CORS domains from env: {domains}")

print(f"DEBUG: Final allow_origins: {allow_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for local file serving
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(grievances.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")
app.include_router(opportunities.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Welcome to AEGIS Platform API",
        "version": "0.1.0",
        "status": "operational",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
