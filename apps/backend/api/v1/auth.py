"""
Authentication & Multi-Tenant Context Routes
"""
from fastapi import APIRouter, Depends
from apps.backend.core.auth import get_tenant_context, TenantContext
from apps.backend.models.schemas import UserContextResponse

router = APIRouter(prefix="/api/v1/auth", tags=["Auth & Tenancy"])

@router.get("/me", response_model=UserContextResponse)
async def get_current_user_context(context: TenantContext = Depends(get_tenant_context)):
    """
    Returns the authenticated user's ID and active Clerk Organization (tenant_id).
    Used to verify JWT validation & tenant extraction.
    """
    return UserContextResponse(
        tenant_id=context.tenant_id,
        user_id=context.user_id,
        org_role=context.org_role
    )

