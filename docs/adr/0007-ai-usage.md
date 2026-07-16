# ADR 0007 — AI usage disclosure

- **Status:** Accepted
- **Date:** 2026-07-16
- **Source:** `DEFINITION.md` (suma puntos); implementation phases 0-6

## Context

The challenge explicitly values transparency about AI usage in the dev
flow. The repo must show which decisions were AI-assisted and which
were authored by the candidate.

## Decision

AI assistance was used as an engineering accelerator, not as an
unreviewed authority.

AI-assisted work:

- Convert the challenge into phased execution docs and acceptance
  criteria.
- Draft and refine ADRs after decisions were selected.
- Generate boilerplate for NestJS, React, Docker and GitHub Actions.
- Search for consistency problems across docs and implementation.
- Propose fixes during QA, especially around Docker healthchecks,
  Prisma dependency injection and browser `fetch` binding.
- Run local validation commands and summarize results.

Human-reviewed decisions:

- Use pnpm monorepo instead of two repos.
- Use PostgreSQL + Prisma with `db push` instead of migrations.
- Keep only `POST /pokemon` for creation and duplicate handling.
- Resolve duplicate races in backend via `P2002` recovery.
- Keep frontend contract backend-only: `types: string[]` and required
  `createdAt`.
- Use Docker Compose as the primary demo path.
- Require coverage thresholds globally.

Rejected or adjusted AI suggestions:

- Avoided adding new routes for frontend duplicate precheck.
- Avoided adding broad compatibility layers not required by the
  challenge.
- Moved DB initialization to explicit `db-init` instead of runtime
  backend mutation.
- Bound browser `fetch` explicitly after real browser behavior showed
  context loss.

The candidate remains responsible for final design, tradeoffs,
verification and submitted prose.

## Consequences

- Reviewers can see where AI accelerated drafting and verification.
- ADRs keep final decisions auditable.
- Documentation may be more extensive than a minimal challenge
  submission, but it records tradeoffs and validation clearly.
