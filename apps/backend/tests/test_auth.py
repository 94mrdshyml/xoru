"""
Unit & Integration Tests for Auth & Multi-Tenancy Middleware
"""
import pytest
from fastapi.testclient import TestClient
from apps.backend.main import app

client = TestClient(app)

def test_health_check():
    """Verify healthcheck endpoint returns 200 and tagline."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["tagline"] == "Short Link. Real Intelligence."

def test_missing_auth_header_fails():
    """Verify endpoint rejects requests missing Bearer token."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

def test_dev_tenant_header_override():
    """Verify dev header overrides tenant extraction in development mode."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"X-Tenant-Id": "org_test_123456789012345678901234"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tenant_id"] == "org_test_123456789012345678901234"
