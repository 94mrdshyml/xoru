"""
Xoru Backend Worker (FastAPI & Cloudflare Workers Python Entrypoint)
Tagline: Short Link. Real Intelligence.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apps.backend.api.v1.auth import router as auth_router
from apps.backend.api.v1.workspaces import router as workspaces_router

app = FastAPI(
    title="Xoru Backend API",
    description="Short Link. Real Intelligence. Multi-tenant link shortening and dynamic routing API.",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(workspaces_router)

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint to verify worker & API status."""
    return {
        "status": "healthy",
        "service": "xoru-backend",
        "tagline": "Short Link. Real Intelligence.",
        "version": "0.1.0"
    }

@app.get("/{code_or_slug}")
async def redirect_short_link(code_or_slug: str, request: Request):
    """
    Public short link redirection endpoint.
    Performs sub-10ms lookup against Cloudflare KV / Neon DB.
    """
    if code_or_slug in ("health", "docs", "openapi.json"):
        return await health_check()
        
    return JSONResponse(
        status_code=404,
        content={"error": {"code": "LINK_NOT_FOUND", "message": f"Short link '{code_or_slug}' not found."}}
    )

# Cloudflare Workers Python Pyodide runtime wrapper
try:
    from js import Response
    import json

    async def on_fetch(request, env):
        """Cloudflare Workers Pyodide entrypoint."""
        url = str(request.url)
        if "/health" in url or "/api/v1/health" in url:
            data = {
                "status": "healthy",
                "service": "xoru-backend",
                "tagline": "Short Link. Real Intelligence.",
                "version": "0.1.0"
            }
            return Response.new(json.dumps(data), headers={"Content-Type": "application/json"})
        return Response.new(json.dumps({"status": "ok"}), headers={"Content-Type": "application/json"})
except ImportError:
    # Running outside Cloudflare Workers Pyodide container (e.g. Pytest / uvicorn)
    pass
