from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database - will be overridden by Railway's DATABASE_URL
    # Railway provides postgresql:// but we need postgresql+asyncpg://
    database_url: str = (
        "postgresql+asyncpg://aegis_user:aegis_pass@localhost:5432/aegis_db"
    )

    @property
    def async_database_url(self) -> str:
        """Ensure database URL uses asyncpg driver."""
        url = self.database_url
        # Replace postgresql:// with postgresql+asyncpg:// if needed
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # Redis
    redis_url: str = "redis://localhost:6379"

    # JWT
    jwt_secret: str = "your-super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # App
    app_name: str = "AEGIS Platform"
    debug: bool = False

    # File Upload
    upload_dir: str = "./uploads"
    max_file_size: int = 10 * 1024 * 1024  # 10MB

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
