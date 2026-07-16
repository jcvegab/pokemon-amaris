# ADR 0005 — GitHub Actions CI

- **Status:** Accepted (stub; full content in Phase 2C)
- **Source:** `docs/CI.md` §4, §5

## Context

The repo is private and hosted on GitHub. CI must enforce quality gates
on every PR and produce the OpenAPI spec as a build artefact.

## Decision

- `pnpm` with `corepack`; `actions/setup-node` v4 with `cache: 'pnpm'`.
- `workflows/ci.yml` with four jobs (run on every PR, no change
  detection): `backend`, `frontend`, `backend-openapi`, `summary`.
- `workflows/docker.yml` builds `backend` and `frontend` images with
  `docker/buildx`, tagging by `gitsha` and branch.
- `backend-openapi` reuses the `dist/` from the `backend` job, spins
  up a Postgres service, runs `prisma:push`, boots the app, waits for
  `/docs-json`, downloads it as an artefact.
- `summary` posts a coverage comment on the PR.

## Consequences

- CI is the only source of truth for "is this PR green?".
- OpenAPI is regenerated on every PR; downstream consumers can diff it.
- No path filtering: backend and frontend always run. Keeps the
  pipeline simple and predictable.
