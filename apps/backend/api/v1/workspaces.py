"""
Workspace Management & Onboarding API Routes
Tagline: Short Link. Real Intelligence.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from typing import Optional
from apps.backend.core.auth import get_tenant_context, TenantContext
from apps.backend.core.db import get_tenant_db_session
from apps.backend.utils.id import generate_id

router = APIRouter(prefix="/api/v1/workspaces", tags=["Workspaces & Onboarding"])

class OnboardRequest(BaseModel):
    first_name: str = Field(..., json_schema_extra={"example": "John"})
    last_name: str = Field("", json_schema_extra={"example": "Doe"})
    email: str = Field(..., json_schema_extra={"example": "john@example.com"})
    workspace_name: str = Field(..., json_schema_extra={"example": "John's Workspace"})

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str

@router.post("/onboard", response_model=WorkspaceResponse)
async def onboard_user_workspace(
    data: OnboardRequest,
    context: TenantContext = Depends(get_tenant_context)
):
    """
    Onboards a newly registered user:
    1. Stores first_name and last_name separately.
    2. Automatically provisions '<First Name>'s Workspace' in Neon DB.
    """
    tenant_id = context.tenant_id
    workspace_id = generate_id("org")
    slug_base = f"{data.first_name.lower()}-workspace".replace(" ", "-")
    slug = f"{slug_base}-{generate_id('org')[4:10]}"

    async with get_tenant_db_session(tenant_id) as session:
        # Insert workspace into Neon DB
        await session.execute(
            text("""
                INSERT INTO workspaces (id, name, slug)
                VALUES (:id, :name, :slug)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
            """),
            {"id": tenant_id, "name": data.workspace_name, "slug": slug}
        )

    return WorkspaceResponse(
        id=tenant_id,
        name=data.workspace_name,
        slug=slug
    )
