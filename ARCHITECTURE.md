# Sierhill.org — Architecture & Documentation

## Overview

Sierhill.org is the website for a genomic analysis organization. It consists of a static landing page, a backend API, and a PostgreSQL database, all deployed on Railway.

**Live URL:** https://www.sierhill.org
**Repository:** https://github.com/sujaynelson/sierhill-org-website

---

## Architecture

```
┌──────────────┐         ┌──────────────────┐         ┌────────────┐
│   Browser    │──GET───▶│  Frontend (Nginx) │         │            │
│              │◀──HTML──│  www.sierhill.org  │         │  PostgreSQL│
│              │         └──────────────────┘         │            │
│              │                                       │  - pages   │
│              │──POST──▶┌──────────────────┐──SQL───▶│  - sections│
│              │◀──JSON──│  API (Express)    │◀──rows──│  - views   │
│              │         │  impartial-       │         │  - events  │
│              │         │  surprise-...     │         │            │
└──────────────┘         └──────────────────┘         └────────────┘
```

### Services (Railway)

| Service | Type | Domain | Root Dir |
|---------|------|--------|----------|
| sierhill-org-website | Static site (Nginx) | www.sierhill.org | `/` |
| impartial-surprise | Node.js API (Express) | impartial-surprise-production-e659.up.railway.app | `/api` |
| Postgres | PostgreSQL database | Internal (Railway private network) | — |

### DNS (GoDaddy)

| Record | Name | Value |
|--------|------|-------|
| CNAME | www | 3ze1u10b.up.railway.app |
| TXT | _railway-verify | (verification token for root) |
| TXT | _railway-verify.www | (verification token for www) |
| Forwarding | sierhill.org → https://www.sierhill.org | 301 permanent redirect |

> GoDaddy does not support CNAME on root (`@`) domains. Domain forwarding handles the root → www redirect.

---

## Project Structure

```
sierhill-org-website/
├── index.html              # Landing page
├── styles.css              # Dark theme, responsive styles
├── main.js                 # DNA helix animation, scroll effects, analytics beacon
├── Dockerfile              # Frontend: nginx:alpine container
├── nginx.conf              # Nginx config with caching and security headers
├── ARCHITECTURE.md         # This file
├── .gitignore
└── api/
    ├── Dockerfile          # API: node:20-alpine container
    ├── package.json
    ├── .env.example        # Template for environment variables
    ├── migrations/
    │   ├── 001_create_content.sql
    │   └── 002_create_analytics.sql
    └── src/
        ├── index.js        # Express app entry point
        ├── db.js           # PostgreSQL connection pool
        ├── migrate.js      # Auto-migration runner (runs on startup)
        ├── middleware/
        │   └── auth.js     # API key authentication
        └── routes/
            ├── health.js   # GET /health
            ├── content.js  # Content management CRUD
            └── analytics.js# Page view and event tracking
```

---

## Frontend

- **Tech:** Static HTML/CSS/JS served via Nginx
- **Theme:** Dark background (#0a0e17) with blue/cyan accent colors
- **Features:**
  - Animated DNA double helix (canvas)
  - Scroll-triggered fade-in animations
  - Responsive layout (mobile nav toggle)
  - Analytics beacon (fires pageview on load)
- **Sections:** Hero, About, Services, Approach, Contact

---

## API

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (auto-injected by Railway) |
| `API_KEY` | Secret key for protected endpoints |
| `FRONTEND_URL` | Allowed CORS origin (https://www.sierhill.org) |
| `PORT` | Server port (set by Railway, defaults to 3000) |

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check, verifies DB connection |
| GET | `/api/v1/content/:slug` | — | Get page with all sections |
| PUT | `/api/v1/content/:slug` | API key | Upsert page and sections |
| PUT | `/api/v1/content/:slug/sections/:key` | API key | Upsert a single section |
| POST | `/api/v1/analytics/pageview` | — | Record a page view |
| POST | `/api/v1/analytics/event` | — | Record a custom event |
| GET | `/api/v1/analytics/summary` | API key | Get analytics dashboard data |

### Authentication

Protected endpoints require the `x-api-key` header:

```
curl -H "x-api-key: YOUR_API_KEY" https://impartial-surprise-production-e659.up.railway.app/api/v1/analytics/summary
```

### Rate Limiting

Analytics endpoints (`/pageview`, `/event`) are rate-limited to 30 requests per minute per IP.

---

## Database Schema

### Content Management

**pages** — Top-level page definitions

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| slug | VARCHAR(100) | Unique URL slug (e.g., "home") |
| title | VARCHAR(255) | Page title |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**sections** — Page content blocks with flexible JSONB storage

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| page_id | INTEGER | FK → pages.id |
| key | VARCHAR(100) | Section identifier (e.g., "hero_heading") |
| content | JSONB | Flexible content (heading, body, image, etc.) |
| sort_order | INTEGER | Display order |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Analytics

**page_views** — Visitor page view tracking

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| page_path | VARCHAR(500) | URL path visited |
| referrer | VARCHAR(1000) | HTTP referrer |
| user_agent | VARCHAR(1000) | Browser user agent |
| ip_hash | VARCHAR(64) | SHA-256 hashed IP (privacy-safe) |
| created_at | TIMESTAMPTZ | Timestamp |

**events** — Custom event tracking

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| name | VARCHAR(100) | Event name (e.g., "cta_click") |
| page_path | VARCHAR(500) | Page where event occurred |
| metadata | JSONB | Additional event data |
| created_at | TIMESTAMPTZ | Timestamp |

---

## Deployment

Both services auto-deploy when code is pushed to the `main` branch on GitHub.

```bash
git add -A
git commit -m "your change"
git push
```

Railway will:
1. Detect the push
2. Build both services (frontend from `/`, API from `/api`)
3. Deploy automatically

### Manual Redeployment

If needed, redeploy from the Railway dashboard by clicking on a service → Deployments → Redeploy, or via CLI:

```bash
railway up          # Deploys from current directory
```

---

## Useful Commands

```bash
# Check API health
curl https://impartial-surprise-production-e659.up.railway.app/health

# View analytics (last 30 days)
curl -H "x-api-key: YOUR_API_KEY" \
  "https://impartial-surprise-production-e659.up.railway.app/api/v1/analytics/summary?days=30"

# Record a test pageview
curl -X POST -H "Content-Type: application/json" \
  -d '{"path":"/test","referrer":""}' \
  https://impartial-surprise-production-e659.up.railway.app/api/v1/analytics/pageview

# Create/update page content
curl -X PUT -H "Content-Type: application/json" -H "x-api-key: YOUR_API_KEY" \
  -d '{"title":"Home","sections":[{"key":"hero","content":{"heading":"Welcome"},"sort_order":0}]}' \
  https://impartial-surprise-production-e659.up.railway.app/api/v1/content/home
```
