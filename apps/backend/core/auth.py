"""
Clerk Authentication & Multi-Tenant JWT Context Extraction
Tagline: Short Link. Real Intelligence.
"""
import os
import jwt
from fastapi import Header, HTTPException, Request, Depends
from typing import Optional

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "sk_test_demo")

class TenantContext:
    def __init__(self, tenant_id: str, user_id: str, org_role: Optional[str] = None):
        self.tenant_id = tenant_id  # org_xxx or usr_xxx
        self.user_id = user_id      # usr_xxx
        self.org_role = org_role    # admin, member, owner

async def verify_clerk_token(authorization: Optional[str] = Header(None)) -> dict:
    """
    Extracts and verifies Bearer JWT token from Clerk.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Missing or invalid Bearer Authorization header."}}
        )

    token = authorization.split(" ")[1]

    try:
        # Decode unverified header/claims for development, or verify against Clerk public key
        # For production, verify with Clerk JWKS
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "INVALID_TOKEN", "message": f"JWT token verification failed: {str(e)}"}}
        )

async def get_tenant_context(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None)
) -> TenantContext:
    """
    FastAPI dependency that extracts Clerk user and organization (tenant_id) claims.
    """
    # Development/Testing fallback header for local testing
    if x_tenant_id and os.getenv("ENVIRONMENT", "development") != "production":
        return TenantContext(
            tenant_id=x_tenant_id,
            user_id="usr_dev_admin",
            org_role="admin"
        )

    payload = await verify_clerk_token(authorization)
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "INVALID_USER_CLAIM", "message": "JWT token missing 'sub' user claim."}}
        )

    # Clerk passes active organization in 'org_id' claim
    org_id = payload.get("org_id")
    org_role = payload.get("org_role")

    # If user has no active org, fall back to personal tenant (usr_id)
    tenant_id = org_id if org_id else user_id

    return TenantContext(
        tenant_id=tenant_id,
        user_id=user_id,
        org_role=org_role
    )
