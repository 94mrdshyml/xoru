# CI_CD_WORKFLOW.md — GitHub Actions & Automated Agent Remediation Protocol

**Tagline**: *Short Link. Real Intelligence.*

This document details the GitHub Actions CI/CD pipeline, Cloudflare Worker deployment steps, and the Antigravity Agent Watch Protocol.

---

## 1. Pipeline Overview

```mermaid
flowchart TD
    GitPush[Push or PR to main] --> GH_CI[GitHub Actions CI Pipeline]
    
    subgraph CI Jobs (ci.yml)
        GH_CI --> Job_Lint[1. Lint & Format (Ruff + ESLint)]
        GH_CI --> Job_Type[2. Type Check (tsc + Pyright)]
        GH_CI --> Job_Test[3. Unit & Integration Tests (Pytest + Vitest)]
        GH_CI --> Job_Migrate[4. DB Migration Dry-Run (Alembic)]
        GH_CI --> Job_Build[5. Build Check (Next.js Worker)]
    end

    Job_Build -->|All Checks Pass| GH_Deploy[GitHub Actions Deploy (deploy.yml)]
    
    subgraph CD Jobs (deploy.yml)
        GH_Deploy --> Apply_Migrations[1. Apply Neon DB Migrations]
        GH_Deploy --> Deploy_FE[2. Deploy xoru-frontend Worker]
        GH_Deploy --> Deploy_BE[3. Deploy xoru-backend Worker]
    end

    GH_CI -->|Any Check Fails| AGY_Watch[AGY Agent Watch Protocol]
    AGY_Watch --> AGY_Fix[Read Logs -> Fix Root Cause -> Push & Re-trigger]
```

---

## 2. GitHub Actions Workflows

### Required Secrets
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEON_DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### A. `ci.yml` — Pull Requests & Commits
Runs full validation suite before code can be merged or deployed.

```yaml
name: CI Checks

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Run Backend Tests
        run: npm run test:backend

      - name: Run Frontend Tests
        run: npm run test:frontend

      - name: Build Frontend Worker
        run: npm run build --workspace=apps/frontend
```

### B. `deploy.yml` — Automated Cloudflare Deployment
Triggers on `push: main` after `ci.yml` completes with green status.

---

## 3. GH Actions & Cloudflare Deploy Watch Protocol

After every push to `main`, Antigravity **must** execute the following protocol:

1. **Watch Workflow Execution**: Monitor GitHub Actions tab until completed.
2. **Log Inspection on Failure**: If any action fails, immediately fetch and inspect full step logs.
3. **Root-Cause Remediation**: Fix the root cause of the failure without masking symptoms or swallowing errors.
4. **Push Fix & Re-verify**: Commit the fix to git and watch CI again until green.
5. **Verify Worker Deployments**:
   ```bash
   wrangler deployments list --workspace=apps/frontend
   wrangler deployments list --workspace=apps/backend
   ```
6. **Tail Runtime Logs if Error Occurs**:
   ```bash
   wrangler tail --workspace=apps/backend
   ```
7. **Final Verification**: Report success only when GH Actions are 100% green AND Cloudflare Workers are live without errors.

