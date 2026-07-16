# ADR 0000 — Contract freezing

- **Status:** Superseded by final documentation
- **Date:** 2026-07-16
- **Owner:** Architecture
- **Source:** `README.md`; `docs/DIAGRAM.md`; ADRs `0001..0011`

## Context

Early project phases used planning documents to freeze the HTTP
contract, environment variables, versions, error codes, concurrency
semantics and coverage gates before implementation started.

Those planning documents were removed after the implementation was
completed to keep only final documentation in the repository.

## Decision

During implementation, contract changes required an ADR before code
changed. After cleanup, the final contract lives in:

1. `README.md` for setup, runtime behavior, endpoints and errors.
2. `docs/DIAGRAM.md` and `docs/diagrams/*.mmd` for system flow.
3. ADRs `0001..0011` for accepted technical decisions and deltas.

## Consequences

- Historical planning docs no longer compete with implemented code.
- Reviewers use `README.md`, diagrams and ADRs as the canonical docs.
- Future contract changes still require a new ADR plus updates to the
  final documentation in the same PR.
