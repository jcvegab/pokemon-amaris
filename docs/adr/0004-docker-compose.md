# ADR 0004 — Docker Compose for local + containerized delivery

- **Status:** Accepted
- **Source:** `docs/CI.md` §6, `docs/EXECUTION.md` §5 (Phase 3), `docs/FRONTEND.md` §12

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
- Nginx in the frontend container (`apps/frontend/nginx.conf`)
  proxies `/api/*` → `http://backend:3000/*` (genérico, no solo
  `/api/pokemon`). The frontend always calls
  `${VITE_API_BASE_URL}/...`, which resolves to `/api/...` in both
  dev (Vite proxy) and prod (Nginx proxy).
- El contenedor frontend expone `GET /healthz` (respuesta estática
  `200 ok`) usado por el `HEALTHCHECK` del `Dockerfile`. La app
  real (backend) expone `GET /health` con Terminus.

## Consequences

- `docker compose up --build` brings the whole stack online.
- Restart of the backend container does not lose data (`pgdata` volume).
- `db-init` is a one-shot; the backend waits for it, not for the DB
  socket directly.
- El proxy genérico `/api/*` cubre endpoints futuros (p. ej.
  `GET /pokemon/:name` descrito en ADR `0010`) sin cambios en
  `nginx.conf`.
- El healthcheck de Docker (`/healthz`) y el de la app
  (`backend /health`) son independientes; el primero valida que
  Nginx responde, el segundo que el backend y la DB están vivos.
