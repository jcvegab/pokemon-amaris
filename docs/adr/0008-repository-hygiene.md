# ADR 0008 — Repository hygiene

- **Status:** Accepted (stub; full content in Phase 2C)
- **Source:** `docs/CI.md` §9

## Context

A private monorepo lives or dies by its automation: Dependabot, PR
templates, issue templates, CODEOWNERS, branch protection. Without
them, the repo rots.

## Decision

- `.github/dependabot.yml` with three ecosystems: `npm` (root),
  `github-actions`, `docker`. Weekly schedule, group minor/patch.
- `.github/pull_request_template.md` with type, change list, how to
  test, UI checklist, risks, and review checklist.
- `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md`.
- `.github/CODEOWNERS` mapping each area to a placeholder owner
  (`@jcvegab`).
- Branch protection on `master`: 1 approver, dismiss stale, require
  `ci/backend`, `ci/frontend`, `ci/summary`, linear history, no force
  pushes, no deletions.
- Token permissions: `contents: read`, `pull-requests: write`,
  `checks: write`, `security-events: read` (for CodeQL).

## Consequences

- Dependabot PRs stay small and grouped.
- PR template forces the author to think about rollback and UI impact.
- Branch protection guarantees the contract is enforced by the
  pipeline, not by the integrator's memory.
