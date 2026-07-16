# ACCEPTANCE — Per-phase criteria matrix

One row per phase, one column per criterion. A phase is "done" only
when every cell in its row is checked. Mirrors `EXECUTION.md` §10
but laid out so an integrator or QA agent can tick boxes
mechanically.

Legend: `[ ]` pending, `[x]` required to close, `[~]` optional /
nice.

## Phase 0 — Contracts and decisions

| #   | Criterion                                                                                      | Status |
| --- | ---------------------------------------------------------------------------------------------- | ------ |
| 0.1 | `docs/CONTRACT.md` exists and freezes HTTP contract, env vars, versions.                       | [x]    |
| 0.2 | Pinned versions cover Node, pnpm, TS, NestJS, Prisma, React, Vite, Tailwind, Postgres, Docker. | [x]    |
| 0.3 | Env var table names owner, default, validation, and required flag for each variable.           | [x]    |
| 0.4 | HTTP contract covers `POST /pokemon` and `GET /health` with status codes and bodies.           | [x]    |
| 0.5 | Error schema (`statusCode`, `code`, `message`, `timestamp`, `path`) and stable codes listed.   | [x]    |
| 0.6 | `docs/adr/README.md` lists ADRs `0000..0008` with status and owner.                            | [x]    |
| 0.7 | Each ADR has at least a stub (Context, Decision, Consequences) for Phase 2C to expand.         | [x]    |
| 0.8 | `docs/ACCEPTANCE.md` (this file) exists with one row per phase.                                | [x]    |
| 0.9 | Branch `feat/phase-0-architecture` exists. No code outside `docs/`.                            | [x]    |

## Phase 1 — Monorepo foundation

| #    | Criterion                                                                                        | Status |
| ---- | ------------------------------------------------------------------------------------------------ | ------ |
| 1.1  | `pnpm install` succeeds with no critical warnings.                                               | [ ]    |
| 1.2  | `pnpm lint` passes against empty `src/`.                                                         | [ ]    |
| 1.3  | `pnpm test` passes against empty `src/`.                                                         | [ ]    |
| 1.4  | `pnpm build` passes against empty `src/`.                                                        | [ ]    |
| 1.5  | `tsconfig.base.json` enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. | [ ]    |
| 1.6  | ESLint flat config + Prettier + Husky pre-commit + `lint-staged` all active.                     | [ ]    |
| 1.7  | `.nvmrc` pins Node 24; `.npmrc` sets `strict-peer-dependencies=true`.                            | [ ]    |
| 1.8  | `.env.example` matches `CONTRACT.md` §2 (root vars only).                                        | [ ]    |
| 1.9  | `apps/backend` and `apps/frontend` exist with minimal `package.json` delegating to workspace.    | [ ]    |
| 1.10 | Single commit `chore: initialize monorepo foundation` on `feat/phase-1-foundation`.              | [ ]    |

## Phase 2A — Backend

| #     | Criterion                                                                                            | Status |
| ----- | ---------------------------------------------------------------------------------------------------- | ------ |
| 2A.1  | `pnpm --filter @pokemon-amaris/backend lint` passes.                                                 | [ ]    |
| 2A.2  | `pnpm --filter @pokemon-amaris/backend test:cov` passes with global coverage ≥ 85/85/85/80.          | [ ]    |
| 2A.3  | `pnpm --filter @pokemon-amaris/backend build` succeeds.                                              | [ ]    |
| 2A.4  | `POST /pokemon` with `{ name }` and empty DB returns `201`.                                          | [ ]    |
| 2A.5  | `POST /pokemon` with existing record returns `200` and **does not** call PokeAPI (asserted in test). | [ ]    |
| 2A.6  | `POST /pokemon` with `{ pokemon }` works like `{ name }`.                                            | [ ]    |
| 2A.7  | Body validation: empty, both fields, extra field, length 51 — all return `400`.                      | [ ]    |
| 2A.8  | Normalization: `Pikachu ` / `  PIKACHU  ` → `pikachu`.                                               | [ ]    |
| 2A.9  | PokeAPI `404` → `404`; timeout/`5xx` → `502`; invalid payload → `502`.                               | [ ]    |
| 2A.10 | DB down on read or write → `503`.                                                                    | [ ]    |
| 2A.11 | `P2002` recovery in `PrismaPokemonRepository.save()` keeps a single row and returns `200`.           | [ ]    |
| 2A.12 | Error body matches `ErrorResponse` for every error path.                                             | [ ]    |
| 2A.13 | `GET /health` returns `200` with `database.status=up` when Prisma mock succeeds.                     | [ ]    |
| 2A.14 | `GET /health` returns `503` with `database.status=down` when Prisma mock throws.                     | [ ]    |
| 2A.15 | Swagger served at `/docs` and `/docs-json`.                                                          | [ ]    |
| 2A.16 | `nestjs-pino` logger emits `requestId`; `pokemonName` and `outcome` on `POST /pokemon` success.      | [ ]    |
| 2A.17 | Dockerfile multi-stage builds from `node:24-alpine`; runtime CMD runs only `node dist/main.js`.      | [ ]    |
| 2A.18 | Backend exposes only `POST /pokemon` and `GET /health` (ADR `0011`).                                 | [ ]    |
| 2A.19 | Single commit `feat(backend): implement pokemon service` on `feat/phase-2a-backend`.                 | [ ]    |

## Phase 2B — Frontend

| #     | Criterion                                                                                                                             | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2B.1  | `pnpm --filter @pokemon-amaris/frontend lint` passes.                                                                                 | [ ]    |
| 2B.2  | `pnpm --filter @pokemon-amaris/frontend test:cov` passes with global coverage ≥ 85/85/85/80 (exclusiones declaradas).                 | [ ]    |
| 2B.3  | `pnpm --filter @pokemon-amaris/frontend build` succeeds.                                                                              | [ ]    |
| 2B.4  | Client siempre envía `{ name }` al `POST` `${VITE_API_BASE_URL}/pokemon` (no `{ pokemon }` en la UI).                                 | [ ]    |
| 2B.5  | Normalización de `pikachu`, `Pikachu `, `  PIKACHU  ` en el formulario (via `PokemonName`).                                           | [ ]    |
| 2B.6  | Hook expone estados `idle` / `loading` / `success` / `error` con unión discriminada.                                                  | [ ]    |
| 2B.7  | El cliente solo envía `POST /pokemon`. No hay `GET` previo; los duplicados los resuelve el backend con `P2002` recovery (ADR `0011`). | [ ]    |
| 2B.8  | Hook descarta resultados tardíos vía `AbortController` por `submit`; cancelación del request no se inyecta al HTTP.                   | [ ]    |
| 2B.9  | Respuesta de éxito validada contra el contrato backend (`types: string[]`, `createdAt` requerido).                                    | [ ]    |
| 2B.10 | `createdAt` se exige y se renderiza formateado en `es-PE`.                                                                            | [ ]    |
| 2B.11 | Errors 400, 404, 502, 503, timeout, network: `message` del backend se conserva si el body encaja; fallback humano si no.              | [ ]    |
| 2B.12 | Composition root en `src/app/composition-root.ts`; tests usan `InMemoryPokemonRepository`.                                            | [ ]    |
| 2B.13 | Temática Pokémon: paleta rojo/blanco/negro/amarillo, pokébola SVG, ficha, spinner; sin imágenes externas.                             | [ ]    |
| 2B.14 | Accessibility: roles ARIA, foco visible, labels asociados en `PokemonForm`.                                                           | [ ]    |
| 2B.15 | Responsive: mobile (≤ 480px) y desktop (≥ 1024px) layouts presentes.                                                                  | [ ]    |
| 2B.16 | Vite dev proxy `/api/*` → `http://localhost:3000`.                                                                                    | [ ]    |
| 2B.17 | Frontend Dockerfile multi-stage con Nginx; `nginx.conf` proxifica `/api/*` → `http://backend:3000/*` y `/healthz`.                    | [ ]    |
| 2B.18 | Single commit `feat(frontend): build pokemon themed interface` on `feat/phase-2b-frontend`.                                           | [ ]    |

## Phase 2C — Documentation initial

| #    | Criterion                                                                 | Status |
| ---- | ------------------------------------------------------------------------- | ------ |
| 2C.1 | ADRs `0001..0010` filled with full Nygard sections (no stubs).            | [ ]    |
| 2C.2 | `docs/diagrams/sequence.mmd` matches `DIAGRAM.md` §3 source.              | [ ]    |
| 2C.3 | `docs/diagrams/architecture.mmd` matches `DIAGRAM.md` §4 source.          | [ ]    |
| 2C.4 | Single commit `docs: add architecture decisions` on `feat/phase-2c-docs`. | [ ]    |

## Phase 3 — Integration and Docker

| #    | Criterion                                                                                  | Status |
| ---- | ------------------------------------------------------------------------------------------ | ------ |
| 3.1  | `docker compose up --build` brings all three services up without manual steps.             | [ ]    |
| 3.2  | `curl http://localhost:3000/health` returns `200` with `database.status=up`.               | [ ]    |
| 3.3  | `curl -X POST http://localhost:3000/pokemon -d '{"name":"pikachu"}'` returns `201`.        | [ ]    |
| 3.4  | `curl -X POST http://localhost:8080/api/pokemon -d '{"name":"charmander"}'` returns `201`. | [ ]    |
| 3.5  | Repeat `pikachu` returns `200` with the same `createdAt`.                                  | [ ]    |
| 3.6  | After `docker compose restart backend`, the row for `pikachu` is still there.              | [ ]    |
| 3.7  | Stopping `db` makes `GET /health` return `503`.                                            | [ ]    |
| 3.8  | Nginx `/api/*` proxy is verified by an integration test or manual `curl`.                  | [ ]    |
| 3.9  | `wget -qO- http://localhost/healthz` del contenedor frontend responde `200`.               | [ ]    |
| 3.10 | Single commit `chore(infra): add containerized stack` on `feat/phase-3-infra`.             | [ ]    |

## Phase 4 — Quality

| #   | Criterion                                                                                  | Status |
| --- | ------------------------------------------------------------------------------------------ | ------ |
| 4.1 | Backend coverage ≥ 85% lines/statements/functions, ≥ 80% branches.                         | [ ]    |
| 4.2 | Frontend coverage ≥ 85% lines/statements/functions, ≥ 80% branches (exclusiones ADR 0006). | [ ]    |
| 4.3 | `pnpm lint` clean (no warnings) at root.                                                   | [ ]    |
| 4.4 | No secrets in the diff (`grep`-checked for `.env`, tokens, passwords).                     | [ ]    |
| 4.5 | Logs contain no PII; only `requestId`, `pokemonName` (post-normalization), `outcome`.      | [ ]    |
| 4.6 | Frontend `mapError` cubre los códigos backend y cae a fallback humano por `statusCode`.    | [ ]    |
| 4.7 | All `DEFINITION.md` functional cases covered by automated tests.                           | [ ]    |
| 4.8 | Smoke test of `docker compose up` from a clean state succeeds.                             | [ ]    |
| 4.9 | QA agents report findings only; fixes land on the owner's branch.                          | [ ]    |

## Phase 5 — CI and governance

| #   | Criterion                                                                                          | Status |
| --- | -------------------------------------------------------------------------------------------------- | ------ |
| 5.1 | `workflows/ci.yml` has `backend`, `frontend`, `backend-openapi`, `summary` jobs.                   | [ ]    |
| 5.2 | `backend-openapi` job reuses `dist/`, runs `prisma:push` against ephemeral Postgres, fetches spec. | [ ]    |
| 5.3 | `workflows/docker.yml` builds `backend` and `frontend` with buildx.                                | [ ]    |
| 5.4 | `.github/dependabot.yml` covers `npm`, `github-actions`, `docker`.                                 | [ ]    |
| 5.5 | `.github/pull_request_template.md` and issue templates present.                                    | [ ]    |
| 5.6 | `.github/CODEOWNERS` covers backend, frontend, `.github/`, compose, docs.                          | [ ]    |
| 5.7 | Branch protection documented (CI gates listed).                                                    | [ ]    |
| 5.8 | CI green on a clean PR; coverage artefact uploaded.                                                | [ ]    |
| 5.9 | Single commit `ci: add validation workflows` on `feat/phase-5-cicd`.                               | [ ]    |

## Phase 6 — Final documentation

| #   | Criterion                                                                                                                                 | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 6.1 | `README.md` covers description, architecture, stack, prereqs, Docker run, local run, endpoint, errors, tests, decisions, AI use, diagram. | [ ]    |
| 6.2 | `docs/DIAGRAM.md` renders both Mermaid blocks on GitHub.                                                                                  | [ ]    |
| 6.3 | `docs/diagrams/sequence.mmd` and `architecture.mmd` kept as the source of truth.                                                          | [ ]    |
| 6.4 | ADRs `0001..0011` refined (any decisions taken since the stubs are recorded).                                                             | [ ]    |
| 6.5 | `docs/adr/0007-ai-usage.md` filled with the actual record of AI use.                                                                      | [ ]    |
| 6.6 | Single commit `docs: finalize project documentation` on `feat/phase-6-docs`.                                                              | [ ]    |

## Phase 7 — Release

| #    | Criterion                                                              | Status |
| ---- | ---------------------------------------------------------------------- | ------ |
| 7.1  | `pnpm install --frozen-lockfile` clean.                                | [ ]    |
| 7.2  | `pnpm lint`, `pnpm test:cov`, `pnpm build` all green at root.          | [ ]    |
| 7.3  | `docker compose up --build` from clean state serves UI and backend.    | [ ]    |
| 7.4  | `POST /pokemon` with `{ name }` returns `201` first time, `200` after. | [ ]    |
| 7.5  | `POST /pokemon` with `{ pokemon }` also works.                         | [ ]    |
| 7.6  | Body invalid returns `400` with `ErrorResponse`.                       | [ ]    |
| 7.7  | DB down makes `GET /health` return `503`.                              | [ ]    |
| 7.8  | UI works in mobile and desktop.                                        | [ ]    |
| 7.9  | Swagger UI loads at `/docs`.                                           | [ ]    |
| 7.10 | Diagrams render in `docs/DIAGRAM.md`.                                  | [ ]    |
| 7.11 | README walk-through succeeds from a fresh clone.                       | [ ]    |
| 7.12 | Annotated tag `v0.1.0` on `main`. No new code commit in Phase 7.       | [ ]    |
