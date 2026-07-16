# ADR 0001 — Monorepo with pnpm workspaces

- **Status:** Accepted
- **Source:** `docs/STRUCTURE.md` §2, §4, §5; `docs/adr/0011-backend-as-built-alignment.md`

## Context

Backend (NestJS) and frontend (React + Vite) share tooling, configs,
and CI. A monorepo gives a single source of truth for lint, format,
and coverage gates.

## Decision

- Single private monorepo `pokemon-amaris`.
- `pnpm@10.x` workspaces over `apps/*`.
- Node 24 LTS, TypeScript strict.
- The workspace root pins `typescript@^5.7.2`; this is the
  effective version for tooling and for `apps/backend`
  (CommonJS). `apps/frontend` consumes `typescript@^6.0.0`.
  The divergence is documented and intentional (see ADR `0011`).
- `tsconfig.base.json` shared; each app extends it.
- One ESLint flat config and one Prettier config at the root.

## Consequences

- Single `pnpm install` for the whole repo.
- Single PR can touch backend, frontend, and docs coherently.
- Build artifacts (`dist/`, `coverage/`) are scoped per app.
- The TypeScript version split is auditable: `pnpm -v` and
  `pnpm why typescript` from each workspace surface the active
  version.
