# Architecture Decision Records

Index of every ADR in this repo. Each ADR follows the
[Michael Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
(Status, Context, Decision, Consequences).

## Initial list (Phase 0)

| ID   | Title                            | Status   | Owner      |
| ---- | -------------------------------- | -------- | ---------- |
| 0000 | Contract freezing                | Accepted | Arch       |
| 0001 | Monorepo with pnpm workspaces    | Accepted | Foundation |
| 0002 | PostgreSQL + Prisma 5            | Accepted | Backend    |
| 0003 | Hexagonal architecture (no CQRS) | Accepted | Backend    |
| 0004 | Docker Compose for local + dev   | Accepted | Infra      |
| 0005 | GitHub Actions CI                | Accepted | CI/CD      |
| 0006 | Coverage threshold 85% / 80%     | Accepted | QA         |
| 0007 | AI usage disclosure              | Accepted | Docs       |
| 0008 | Repository hygiene               | Accepted | CI/CD      |

## Extensions (Phase 2B)

| ID   | Title                                                               | Status             | Owner    |
| ---- | ------------------------------------------------------------------- | ------------------ | -------- |
| 0009 | Frontend contextual architecture (domain/application/ui)            | Accepted           | Frontend |
| 0010 | Frontend HTTP flow (contrato backend-only, abort parcial, mensajes) | Accepted (revised) | Frontend |

`0000-contract-freezing` is the umbrella: it freezes the Phase 0 contract
in `docs/CONTRACT.md` and binds the rest of the project to it. Any change
requires a new ADR.

`0009` and `0010` are post-Phase 0 extensions that document the
implementation actually shipped in `apps/frontend/`.

## As-built alignment (Phase 2A)

| ID   | Title                                                                            | Status   | Owner   |
| ---- | -------------------------------------------------------------------------------- | -------- | ------- |
| 0011 | Backend as-built alignment (Contexts layout, CommonJS, TS 5.7, `P2002` recovery) | Accepted | Backend |

`0011` records the actual state of `apps/backend/` landed in Phase 2A
and supersedes any plan document that contradicts it (`BACKEND.md`,
`CONTRACT.md`, `STRUCTURE.md`, `DIAGRAM.md`, `EXECUTION.md`,
`ACCEPTANCE.md`, plus ADRs `0001`, `0002`, `0003`, `0004`, `0006`,
`0009`, `0010`). See `0011-backend-as-built-alignment.md` for the
full delta and the change-control rules.

## Files

- `0000-contract-freezing.md`
- `0001-monorepo-pnpm.md`
- `0002-postgres-prisma.md`
- `0003-arquitectura-hexagonal.md`
- `0004-docker-compose.md`
- `0005-github-actions.md`
- `0006-cobertura-85.md`
- `0007-ai-usage.md`
- `0008-repository-hygiene.md`
- `0009-frontend-contextual-architecture.md`
- `0010-frontend-http-flow.md`
- `0011-backend-as-built-alignment.md`

## Status values

- `Accepted`: vigente.
- `Accepted (revised)`: vigente, con cambios respecto a su
  redacción original (registrados en el propio ADR).
- `Proposed`, `Superseded by NNNN`, `Deprecated`: ver el cuerpo
  del ADR.

## Conventions

- One ADR per decision. Don't merge two distinct decisions into one file.
- File names: `NNNN-kebab-case-title.md` with a monotonically increasing
  `NNNN` (no gaps).
- Status values: `Proposed`, `Accepted`, `Superseded by NNNN`,
  `Deprecated`.
- Each ADR must link back to the source doc that triggered it
  (`BACKEND.md`, `FRONTEND.md`, `CI.md`, `STRUCTURE.md`).
