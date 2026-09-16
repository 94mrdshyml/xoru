"""
Neon Database Connection Engine & RLS Session Context Manager
Tagline: Short Link. Real Intelligence.
"""
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# Environment configuration
DATABASE_URL = os.getenv(
    "NEON_DATABASE_URL",
    "postgresql+asyncpg://demo_user:demo_password@localhost/xoru_db"
)

# Fix postgresql:// to postgresql+asyncpg:// if needed
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Async SQLAlchemy Engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Async Session Maker
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

@asynccontextmanager
async def get_tenant_db_session(tenant_id: str) -> AsyncGenerator[AsyncSession, None]:
    """
    Async context manager that guarantees multi-tenant isolation.
    Executes `SET LOCAL app.current_tenant_id = '<tenant_id>'` inside a transaction block.
    """
    if not tenant_id:
        raise ValueError("Tenant ID (org_id) is required for database operations.")
        
    async with AsyncSessionLocal() as session:
        async with session.begin():
            # Set local transaction session variable for Neon Postgres RLS
            await session.execute(
                text("SET LOCAL app.current_tenant_id = :tenant_id"),
                {"tenant_id": tenant_id}
            )
            yield session
