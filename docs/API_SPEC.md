# API_SPEC.md — REST API & Schema Contracts

**Tagline**: *Short Link. Real Intelligence.*

This document specifies the REST API contracts, authentication headers, request/response JSON schemas, and HTTP status codes for `xoru-backend`.

---

## 1. Authentication & Tenant Propagation

All authenticated API requests require a valid Clerk Bearer JWT token in the HTTP Authorization header:

```http
Authorization: Bearer <clerk_jwt_token>
X-Tenant-Id: org_xxx (optional, defaults to active org claim in JWT)
```

Unauthenticated requests are permitted ONLY for edge short link redirection endpoints (`GET /{short_code_or_slug}`).

---

## 2. API Endpoints

### A. Short Link Management

#### 1. Create Short Link
- **POST** `/api/v1/links`
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "title": "Summer Campaign 2026",
    "destination_url": "https://example.com/landing?source=xoru",
    "custom_slug": "summer-2026",
    "redirect_type": 301,
    "expires_at": "2026-12-31T23:59:59Z"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "lnk_9f8e7d6c5b4a3z2y1x0w9v8u",
    "tenant_id": "org_2k9x8a7b6c5d4e3f2g1h0i9j",
    "title": "Summer Campaign 2026",
    "destination_url": "https://example.com/landing?source=xoru",
    "short_code": "a9x2k",
    "custom_slug": "summer-2026",
    "short_url": "https://xoru.link/summer-2026",
    "redirect_type": 301,
    "is_active": true,
    "expires_at": "2026-12-31T23:59:59Z",
    "created_at": "2026-09-16T19:35:00Z"
  }
  ```

#### 2. List Tenant Links
- **GET** `/api/v1/links?page=1&limit=20&search=summer`
- **Auth**: Required
- **Response (200 OK)**:
  ```json
  {
    "data": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42
    }
  }
  ```

#### 3. Update Short Link
- **PATCH** `/api/v1/links/{link_id}`
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "destination_url": "https://example.com/new-destination",
    "is_active": true
  }
  ```
- **Response (200 OK)**: Updated Link Object.

#### 4. Delete Short Link
- **DELETE** `/api/v1/links/{link_id}`
- **Auth**: Required
- **Response (200 OK)**: `{"success": true, "id": "lnk_xxx"}`

---

### B. Link Analytics & Click Insights

#### 1. Fetch Link Click Summary
- **GET** `/api/v1/links/{link_id}/analytics?period=7d`
- **Auth**: Required
- **Response (200 OK)**:
  ```json
  {
    "link_id": "lnk_xxx",
    "total_clicks": 1420,
    "unique_visitors": 1180,
    "clicks_by_date": [
      { "date": "2026-09-10", "clicks": 180 },
      { "date": "2026-09-11", "clicks": 240 }
    ],
    "top_countries": [
      { "country": "US", "clicks": 620 },
      { "country": "IN", "clicks": 340 }
    ],
    "top_devices": [
      { "device": "mobile", "clicks": 890 },
      { "device": "desktop", "clicks": 530 }
    ]
  }
  ```

---

### C. Edge Redirection (Public Endpoint)

#### 1. Perform Short Link Redirect
- **GET** `/{code_or_slug}`
- **Auth**: None (Public Visitor Endpoint)
- **Response**: `HTTP 301 / 302 Redirect` to target destination URL, or `HTTP 404` if not found / expired.

---

## 3. Standard Error Structure

All API errors return a consistent JSON payload:

```json
{
  "error": {
    "code": "SLUG_ALREADY_EXISTS",
    "message": "The custom slug 'summer-2026' is already in use.",
    "details": null
  }
}
```

### Standard Status Codes
- `200 OK`: Successful fetch/update.
- `201 Created`: Link successfully created and synced to KV.
- `400 Bad Request`: Validation error or duplicate slug.
- `401 Unauthorized`: Invalid or missing Clerk JWT.
- `403 Forbidden`: Cross-tenant access attempt blocked by RLS.
- `404 Not Found`: Link code does not exist.
- `500 Internal Error`: Unexpected server error.

