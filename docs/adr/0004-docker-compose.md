# ADR 0004 — Docker Compose for local + containerized delivery

- **Status:** Accepted (stub; full content in Phase 2C)
- **Source:** `docs/CI.md` §6, `docs/EXECUTION.md` §5 (Phase 3)

## Context

`DEFINITION.md` requires a `docker-compose.yml` that brings up backend,
frontend, and database with no manual steps.

## Decision

- Four services in `docker-compose.yml`:
  - `db`: `postgres:17-alpine` with a `pg_isready` healthcheck.
  - `db-init`: `node:24-alpine` that runs `prisma db push` once and exits.
  - `backend`: built from `apps/backend/Dockerfile`, depends on
    `db-init` completing successfully, exposes `3000`.
  - `frontend`: built from `apps/frontend/Dockerfile`, depends on
    `backend` being healthy, exposes `8080` (host) → `80` (nginx).
- Host ports: `5432` (db), `3000` (backend), `8080` (frontend). No
  secrets in Compose; reads from `.env` at deploy time.
- Nginx in the frontend container proxies `/api/pokemon` →
  `http://backend:3000/pokemon`. The frontend always calls
  `${VITE_API_BASE_URL}/pokemon`, which resolves to `/api/pokemon` in
  both dev and prod (Vite proxy vs. Nginx proxy).

## Consequences

- `docker compose up --build` brings the whole stack online.
- Restart of the backend container does not lose data (`pgdata` volume).
- `db-init` is a one-shot; the backend waits for it, not for the DB
  socket directly.
