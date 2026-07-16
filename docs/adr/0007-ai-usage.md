# ADR 0007 — AI usage disclosure

- **Status:** Accepted (stub; full content in Phase 2C)
- **Source:** `DEFINITION.md` (suma puntos), `docs/EXECUTION.md` §6

## Context

The challenge explicitly values transparency about AI usage in the dev
flow. The repo must show which decisions were AI-assisted and which
were authored by the candidate.

## Decision

- Every planning and source doc keeps the candidate's voice; AI is used
  to draft and cross-check, not to write final prose.
- `docs/adr/0007-ai-usage.md` (this file, expanded in Phase 6) lists:
  - Which phases used AI tooling and how.
  - Which decisions were AI-suggested and which were reviewed and
    accepted or rejected.
  - The candidate's own design and voice contributions.
- The README links to this ADR for transparency.

## Consequences

- Reviewers can tell which parts of the solution are mine vs. AI
  assisted.
- The discipline of writing ADRs forces every AI suggestion to pass
  through a documented decision.
