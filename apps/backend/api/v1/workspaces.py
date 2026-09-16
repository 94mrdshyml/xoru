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
    org_id: str
    name: str
    slug: str

@router.post("/onboard", response_model=WorkspaceResponse)
async def onboard_user_workspace(
    data: OnboardRequest,
    context: TenantContext = Depends(get_tenant_context)
):
    """
    Onboards a newly registered user & organization:
    1. Provisions top-level Organization (org_xxx) from Clerk org context.
    2. Automatically provisions '<First Name>'s Workspace' (wrk_xxx) under the organization.
    """
    org_id = context.tenant_id
    org_name = f"{data.first_name}'s Organization"
    org_slug = f"org-{data.first_name.lower()}-{generate_id('org')[4:10]}"

    workspace_id = generate_id("wrk")
    slug_base = data.first_name.lower().replace(" ", "-")
    workspace_slug = f"{slug_base}-workspace-{generate_id('wrk')[4:10]}"

    async with get_tenant_db_session(org_id) as session:
        # 1. Provision Organization
        await session.execute(
            text("""
                INSERT INTO organizations (id, name, slug)
                VALUES (:org_id, :org_name, :org_slug)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
            """),
            {"org_id": org_id, "org_name": org_name, "org_slug": org_slug}
        )

        # 2. Provision Default Workspace under Organization
        await session.execute(
            text("""
                INSERT INTO workspaces (id, org_id, name, slug)
                VALUES (:workspace_id, :org_id, :name, :slug)
            """),
            {
                "workspace_id": workspace_id,
                "org_id": org_id,
                "name": data.workspace_name,
                "slug": workspace_slug
            }
        )

    return WorkspaceResponse(
        id=workspace_id,
        org_id=org_id,
        name=data.workspace_name,
        slug=workspace_slug
    )
