# ADR 0006 — Coverage threshold 85% / 80%

- **Status:** Accepted (stub; full content in Phase 2C)
- **Source:** `docs/CI.md` §8, `docs/EXECUTION.md` §10

## Context

The challenge awards extra points for tests "above 85%". We want a
single, enforceable threshold that applies to both backend and frontend
and fails CI if violated.

## Decision

- Global threshold per app:
  - `lines` ≥ 85
  - `statements` ≥ 85
  - `functions` ≥ 85
  - `branches` ≥ 80
- Backend: enforced in `jest.config.ts` via `coverageThreshold.global`.
- Frontend: enforced in `vitest.config.ts` via `coverage.thresholds`.
- CI publishes the `coverage/` folder of each app as an artefact so
  reviewers can drill in.

## Consequences

- The threshold is uniform across apps, so the test effort is
  comparable.
- Branches at 80% leaves a small gap for uninteresting edges (default
  switches, defensive `null` checks). Lines/statements/functions at
  85% catches real gaps.
- Dropping below the threshold fails the job; no soft warnings.
