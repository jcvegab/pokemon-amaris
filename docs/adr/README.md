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

`0000-contract-freezing` is the umbrella: it freezes the Phase 0 contract
in `docs/CONTRACT.md` and binds the rest of the project to it. Any change
requires a new ADR.

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

Stubs only in Phase 0. Full content is produced in Phase 2C
(`feat/phase-2c-docs`) and refined in Phase 6.

## Conventions

- One ADR per decision. Don't merge two distinct decisions into one file.
- File names: `NNNN-kebab-case-title.md` with a monotonically increasing
  `NNNN` (no gaps).
- Status values: `Proposed`, `Accepted`, `Superseded by NNNN`,
  `Deprecated`.
- Each ADR must link back to the source doc that triggered it
  (`BACKEND.md`, `FRONTEND.md`, `CI.md`, `STRUCTURE.md`).
