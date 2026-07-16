# ADR 0005 — GitHub Actions CI

- **Status:** Accepted
- **Date:** 2026-07-16
- **Source:** `.github/workflows/ci.yml`; `.github/workflows/docker.yml`;
  `.github/workflows/codeql.yml`

## Context

The repo is private and hosted on GitHub. CI must enforce quality gates
on every PR and produce the OpenAPI spec as a build artefact.

## Decision

- CI runs on every `pull_request` and every push to `main`. There is no
  path filtering: backend and frontend always run.
- Node version is `24`; pnpm version is `10.15.0`.
- `workflows/ci.yml` contains four jobs:
  - `ci/backend`: `pnpm install --frozen-lockfile`, backend lint,
    backend coverage, backend build. Uploads `apps/backend/coverage`
    and `apps/backend/dist`.
  - `ci/frontend`: same flow for frontend. Uploads
    `apps/frontend/coverage` and `apps/frontend/dist`.
  - `ci/backend-openapi`: downloads backend `dist`, generates Prisma
    Client, pushes schema to a Postgres 17 service, starts
    `node apps/backend/dist/main.js`, waits for `/docs-json` and
    uploads `openapi.json`.
  - `ci/summary`: extracts line, branch and function coverage from
    `lcov.info`, writes `$GITHUB_STEP_SUMMARY`, comments PRs, and
    fails if any required job failed.
- `workflows/docker.yml` uses Buildx to build backend and frontend
  images. It does not push to a registry. It tags local build metadata
  as `gitsha`, branch and `latest`.
- `workflows/codeql.yml` runs JavaScript/TypeScript CodeQL on PRs,
  pushes to `main` and weekly schedule.
- Minimum token permissions are explicit per workflow.

## Consequences

- CI is the source of truth for PR readiness.
- OpenAPI is regenerated on every PR and attached as an artifact.
- Running all jobs for every PR costs more minutes but removes
  conditional complexity.
- `backend-openapi` intentionally uses real Postgres because Swagger
  generation boots the compiled app. Unit/integration tests still mock
  Prisma and PokeAPI.
- Docker workflow validates images without publishing private artifacts
  to an external registry.
