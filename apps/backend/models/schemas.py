"""
Pydantic Schemas for API Requests & Responses (Pydantic V2)
Tagline: Short Link. Real Intelligence.
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

# --- LINK SCHEMAS ---

class LinkCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, json_schema_extra={"example": "Launch Event 2026"})
    destination_url: str = Field(..., json_schema_extra={"example": "https://example.com/landing"})
    custom_slug: Optional[str] = Field(None, min_length=2, max_length=128, json_schema_extra={"example": "launch-2026"})
    redirect_type: int = Field(301, json_schema_extra={"example": 301})
    expires_at: Optional[datetime] = None

class LinkUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    destination_url: Optional[str] = None
    custom_slug: Optional[str] = None
    redirect_type: Optional[int] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None

class LinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    title: str
    destination_url: str
    short_code: str
    custom_slug: Optional[str] = None
    short_url: str
    redirect_type: int
    is_active: bool
    expires_at: Optional[datetime] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

# --- TENANT CONTEXT RESPONSE ---

class UserContextResponse(BaseModel):
    tenant_id: str
    user_id: str
    org_role: Optional[str] = None

