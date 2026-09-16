"""
Xoru Backend Cloudflare Worker Entrypoint (Python / FastAPI)
Tagline: Short Link. Real Intelligence.
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse

app = FastAPI(
    title="Xoru Backend API",
    description="Short Link. Real Intelligence. Multi-tenant link shortening and dynamic routing API.",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint to verify worker status."""
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
    # Placeholder redirection for Session 1 skeleton
    if code_or_slug == "health":
        return await health_check()
        
    return JSONResponse(
        status_code=404,
        content={"error": {"code": "LINK_NOT_FOUND", "message": f"Short link '{code_or_slug}' not found."}}
    )

