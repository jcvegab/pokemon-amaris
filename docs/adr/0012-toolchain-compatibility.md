# ADR 0012 — Updated toolchain compatibility

- **Status:** Accepted
- **Date:** 2026-10-26
- **Owner:** Backend / Frontend
- **Source:** workspace manifests, TypeScript configs, Jest config and CI workflow
- **Supersedes:** toolchain versions in ADRs `0001` and `0002`; runtime,
  TypeScript, test invocation and Docker runtime details in ADR `0011`

## Context

The dependency update introduces NestJS 12, TypeScript 6, Prisma 7.10.1,
Vite 8 and Vitest 5. The previous backend configuration uses deprecated
Node resolution and a non-relative path alias without `baseUrl`. NestJS
dependencies now expose ESM, and freshly generated Prisma sources use
relative `.js` import specifiers.

## Decision

- Use pnpm 12.15.0 from the root `packageManager` field in development,
  CI and Docker. Install with `--frozen-lockfile` for reproducibility.
- Require Node >=24.9 to support Jest's synchronous ESM loading.
- Use TypeScript 6 in both apps. Backend uses `module: NodeNext` and
  `moduleResolution: NodeNext`, keeps `type: commonjs`, decorator metadata
  and Prisma's `moduleFormat: cjs`. Alias targets are relative paths.
- Enable `--experimental-vm-modules` in all Jest scripts and map relative
  `.js` specifiers to their source counterparts when testing TypeScript.
- Set `--watch` explicitly in the frontend watch script so it keeps watching
  when invoked through workspace scripts or without an interactive terminal.
- Generate Prisma Client after dependency updates and before backend
  checks/builds. Generated sources are unversioned and excluded from Prettier.
- Run `typecheck` per app and from the workspace root. Backend checks
  production and test sources; frontend checks app sources and Vite/Vitest
  configurations. CI enforces these checks in addition to lint and coverage.
- The Docker builder generates and compiles Prisma. The runtime installs
  production dependencies and copies the compiled `dist`, including the
  generated client. Prisma CLI and schema synchronization stay in the builder
  and Compose's `db-init` service. Docker does not depend on a root `.npmrc`.

## Consequences

The backend continues emitting CommonJS and preserves its HTTP contract and
database schema. Tests can consume updated ESM dependencies without converting
application sources to ESM. Type checking catches errors that isolated Jest
transpilation does not report. Coverage thresholds remain 85% for statements,
lines and functions, and 80% for branches.

Validate a clean installation with Prisma generation, typecheck, lint,
coverage, build and format checks. Docker image builds and the Compose flow
require Docker and an ephemeral PostgreSQL database; mocked HTTP integration
tests do not replace that verification.
