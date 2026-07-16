# ADR 0001 — Monorepo with pnpm workspaces

- **Status:** Accepted (stub; full content in Phase 2C)
- **Source:** `docs/STRUCTURE.md` §2, §4, §5

## Context

Backend (NestJS) and frontend (React + Vite) share tooling, configs,
and CI. A monorepo gives a single source of truth for lint, format,
and coverage gates.

## Decision

- Single private monorepo `pokemon-amaris`.
- `pnpm@10.x` workspaces over `apps/*`.
- Node 24 LTS, TypeScript 6.x strict.
- `tsconfig.base.json` shared; each app extends it.
- One ESLint flat config and one Prettier config at the root.

## Consequences

- Single `pnpm install` for the whole repo.
- Single PR can touch backend, frontend, and docs coherently.
- Build artifacts (`dist/`, `coverage/`) are scoped per app.
