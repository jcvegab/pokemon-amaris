# ADR 0000 — Contract Freezing

- **Status:** Accepted
- **Date:** 2026-07-16
- **Owner:** Architecture
- **Source:** `docs/EXECUTION.md` §5 (Phase 0), `docs/CONTRACT.md`

## Context

The project has five planning documents (`STRUCTURE`, `BACKEND`,
`FRONTEND`, `CI`, `DIAGRAM`) plus `EXECUTION`. Each downstream phase
(Foundation, Backend, Frontend, Infra, CI/CD) needs to read the same
contract — HTTP shapes, env vars, pinned versions, error codes — without
reinterpreting prose that was written for a different audience.

Without a single source of truth, the same field (e.g. the env var name
for the backend port) drifts between documents. The `BACKEND_PORT` vs
`PORT` conflict in early drafts is the canonical example.

## Decision

Phase 0 freezes `docs/CONTRACT.md` as the authoritative reference for:

1. Pinned versions of every tool in the stack.
2. Environment variable names, defaults, and ownership.
3. The HTTP contract of `POST /pokemon` and `GET /health`.
4. The error schema and the stable error codes.
5. Concurrency semantics (insert + `P2002` recovery by `name`,
   per ADR `0011`).
6. Coverage thresholds.
7. OpenAPI / Swagger endpoints.
8. Logging fields.

ADR `0011` is the canonical record of the as-built backend and
records the deltas from the original plan. When ADR `0011` and
this ADR disagree on a point, ADR `0011` wins.

The other planning documents (`BACKEND.md`, `FRONTEND.md`, `CI.md`,
`STRUCTURE.md`, `DIAGRAM.md`) describe **how** to implement the contract.
`CONTRACT.md` describes **what** is being built. When the two disagree,
`CONTRACT.md` wins and the other document is wrong.

## Consequences

Positive:

- Downstream agents (Foundation, Backend, Frontend, Infra, CI/CD) read
  one file and start coding.
- A version bump in TypeScript, NestJS, or Prisma only needs a single
  `CONTRACT.md` update plus an ADR; downstream docs follow.
- Code review has a fixed point of reference: "does the code match the
  contract?"

Negative / costs:

- Adds a sixth planning doc. Mitigated by keeping `CONTRACT.md` short
  and stable.
- The freezing rule raises the cost of changing the contract. Mitigated
  by making the change path explicit: write an ADR, update the
  contract, update the agent doc in the same PR.

## Change control

Any change to `CONTRACT.md` after Phase 0 requires:

1. A new ADR under `docs/adr/` describing the delta and the reason.
2. An update to the agent doc that implements the affected area.
3. A single PR with both the ADR and the implementation.

The integrator refuses changes that touch the contract without an ADR.
