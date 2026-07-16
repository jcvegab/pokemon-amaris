# Branch Protection

Recommended protection for `main`:

- Require a pull request before merging.
- Require at least one approving review.
- Require conversation resolution before merge.
- Require branches to be up to date before merge.
- Require status checks to pass before merge:
  - `ci/backend`
  - `ci/frontend`
  - `ci/backend-openapi`
  - `ci/summary`
  - `docker/build-images`
- Require linear history.
- Restrict force pushes.
- Restrict deletions.

Optional checks:

- `codeql/analyze`

Notes:

- CI intentionally runs backend and frontend on every PR.
- PostgreSQL is only used by `ci/backend-openapi` and Docker smoke flows.
- Unit and integration tests mock Prisma and external API dependencies.
