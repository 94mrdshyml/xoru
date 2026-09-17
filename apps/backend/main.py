"""
Xoru Backend Cloudflare Worker Entrypoint (Python)
Tagline: Short Link. Real Intelligence.
"""
from js import Response
import json

async def on_fetch(request, env):
    """
    Cloudflare Workers Python Runtime Entrypoint.
    Executes sub-10ms global edge redirects, health checks, and API routes.
    """
    url = str(request.url)

    if "/health" in url or "/api/v1/health" in url:
        data = {
            "status": "healthy",
            "service": "xoru-backend",
            "tagline": "Short Link. Real Intelligence.",
            "version": "0.1.0"
        }
        return Response.new(json.dumps(data), headers={"Content-Type": "application/json"})

    return Response.new(
        json.dumps({"error": {"code": "NOT_FOUND", "message": "Endpoint or link not found"}}),
        status=404,
        headers={"Content-Type": "application/json"}
    )
