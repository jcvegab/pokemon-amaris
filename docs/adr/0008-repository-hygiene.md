# ADR 0008 — Repository hygiene

- **Status:** Accepted
- **Date:** 2026-07-16
- **Source:** `.github/**`

## Context

A private monorepo lives or dies by its automation: Dependabot, PR
templates, issue templates, CODEOWNERS, branch protection. Without
them, the repo rots.

## Decision

- `.github/dependabot.yml` monitors:
  - npm workspace dependencies from `/`.
  - GitHub Actions from `/`.
  - Dockerfiles in `/apps/backend` and `/apps/frontend`.
- `.github/pull_request_template.md` asks for summary, validation
  commands and notes about risks/follow-ups.
- `.github/ISSUE_TEMPLATE/bug_report.md` captures reproduction steps,
  environment and evidence.
- `.github/ISSUE_TEMPLATE/feature_request.md` captures problem,
  proposal and acceptance criteria.
- `.github/CODEOWNERS` maps the repo, apps, docs, CI and Docker files
  to `@jcvegab`.
- Branch protection is documented in `.github/BRANCH_PROTECTION.md`
  for `main`, not `master`.
- Required status checks:
  - `ci/backend`
  - `ci/frontend`
  - `ci/backend-openapi`
  - `ci/summary`
  - `docker/build-images`
- Optional status check: `codeql/analyze`.

## Consequences

- Dependency updates are scheduled and visible.
- Pull requests have consistent validation notes.
- Branch protection can be configured manually from the documented
  checklist.
- The repository stays simple: no custom GitHub App or release bot is
  required for this challenge.
