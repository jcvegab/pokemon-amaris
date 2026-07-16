# CONTRACT — Phase 0 (con extensiones de Fase 2B y 2A as-built)

Single source of truth for HTTP contract, env vars, and pinned
versions. Frozen at the end of Phase 0. Any change after that
requires an ADR.

> Este documento incorpora extensiones registradas en:
>
> - **ADR 0009** — arquitectura contextual frontend.
> - **ADR 0010** — flujo HTTP frontend (DTO con `types` anidado
>   estilo PokéAPI, preservación de `message` del backend, abort
>   parcial).
> - **ADR 0011** — backend as-built (layout `Contexts/`, CommonJS,
>   TypeScript efectivo 5.7, persistencia vía `P2002`).

## 1. Pinned versions

| Tool          | Version  | Notes                                               |
| ------------- | -------- | --------------------------------------------------- |
| Node          | `24.x`   | LTS line; pinned via `.nvmrc`.                      |
| pnpm          | `10.x`   | Workspaces; pinned via `packageManager`.            |
| TypeScript    | `5.7.x`  | Workspace root; usado por `apps/backend` y tooling. |
| TypeScript    | `6.x`    | Consumido solo por `apps/frontend`.                 |
| NestJS        | `11.x`   | CommonJS build, Node 24 compatible.                 |
| Prisma        | `5.22.x` | `prisma-client-js`, no migrations (push).           |
| React         | `19.x`   | Concurrent rendering; no SSR.                       |
| Vite          | `5.x`    | Dev server + `build`.                               |
| Tailwind CSS  | `4.x`    | Via `@tailwindcss/vite` plugin.                     |
| PostgreSQL    | `17`     | `postgres:17-alpine` en Compose.                    |
| Docker Engine | `>= 24`  | Compose v2 plugin required.                         |

The workspace root fixes `typescript@^5.7.2`; `apps/frontend`
consumes `typescript@^6.0.0`. The divergence is intentional and
documented in ADR `0001` and ADR `0011`.

If a pin must change after Phase 0, document in `docs/adr/` and
bump the ADR index in `docs/adr/README.md`.

## 2. Environment variables

| Variable              | Owner    | Required         | Default     | Validation                               |
| --------------------- | -------- | ---------------- | ----------- | ---------------------------------------- |
| `NODE_ENV`            | backend  | no               | development | `development` \| `test` \| `production`  |
| `PORT`                | backend  | no               | `3000`      | positive int (no upper bound enforced)   |
| `DATABASE_URL`        | backend  | yes              | —           | non-empty string (no scheme check)       |
| `POKEAPI_BASE_URL`    | backend  | yes              | —           | URL                                      |
| `POKEAPI_TIMEOUT_MS`  | backend  | no               | `5000`      | positive int                             |
| `LOG_LEVEL`           | backend  | no               | `info`      | `fatal`..`trace`                         |
| `VITE_API_BASE_URL`   | frontend | yes (build-time) | `/api`      | non-empty string (start with `/` or URL) |
| `VITE_API_TIMEOUT_MS` | frontend | yes (build-time) | `8000`      | positive int                             |

Compose-only (never read by apps):

| Variable            | Used by                | Default   |
| ------------------- | ---------------------- | --------- |
| `POSTGRES_USER`     | `db` service           | `pokemon` |
| `POSTGRES_PASSWORD` | `db` service           | `pokemon` |
| `POSTGRES_DB`       | `db` service           | `pokemon` |
| `POSTGRES_PORT`     | `db` host port mapping | `5432`    |

Host port mapping (defined in `docker-compose.yml`, **not** in
`.env`):

| Service    | Host port | Container port |
| ---------- | --------- | -------------- |
| `db`       | `5432`    | `5432`         |
| `backend`  | `3000`    | `3000`         |
| `frontend` | `8080`    | `80` (nginx)   |

Conventions:

- `PORT` is the internal backend var. Host ports live in Compose.
- `VITE_API_BASE_URL=/api` so the client always hits the same
  path in dev (Vite proxy) and prod (Nginx proxy). No CORS.
- The backend does not validate that `DATABASE_URL` uses the
  `postgresql://` scheme; any non-empty URL is accepted. A
  stricter check is a future enhancement (ADR `0011`).

## 3. HTTP contract

Base path: no global prefix. Endpoints live at the root.

### 3.1 `POST /pokemon`

Request body — exactly one of:

```json
{ "name": "pikachu" }
```

```json
{ "pokemon": "pikachu" }
```

Field rules:

- Both fields `string`, validated as Pokémon name.
- Length `1..50` (after normalization).
- Pattern `^[a-z0-9-]+$`.
- Normalization: `trim()` then `toLowerCase()`.
- Whitelist: any extra property → `400`.
- Both fields present or both absent → `400`.

Responses:

| Status | When                                                             | Body shape                                                        |
| ------ | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| `201`  | Pokémon did not exist in DB; persisted now                       | `PokemonResponse`                                                 |
| `200`  | Pokémon already existed in DB; persisted record returned         | `PokemonResponse`                                                 |
| `400`  | Body invalid (missing name, both fields, extra field, bad shape) | `ErrorResponse` (`VALIDATION_ERROR` or `INVALID_POKEMON_NAME`)    |
| `404`  | PokeAPI returned `404` for the given name                        | `ErrorResponse` (`POKEMON_NOT_FOUND`)                             |
| `502`  | PokeAPI timeout, `5xx`, or payload failed `zod` validation       | `ErrorResponse` (`POKEAPI_UNAVAILABLE` \| `POKEAPI_BAD_RESPONSE`) |
| `503`  | DB read/write failure                                            | `ErrorResponse` (`DATABASE_UNAVAILABLE`)                          |
| `500`  | Unexpected error                                                 | `ErrorResponse` (`INTERNAL_ERROR`)                                |

Important: when the Pokémon already exists, **no** outbound call
is made to PokeAPI. The persisted record is returned as-is (same
`createdAt`).

### 3.2 `GET /health`

No body, no params.

| Status | When                                        | Body shape                                               |
| ------ | ------------------------------------------- | -------------------------------------------------------- |
| `200`  | App responsive and DB queryable             | `Terminus HealthCheckResult` with `database.status=up`   |
| `503`  | DB not queryable (Prisma `$queryRaw` fails) | `Terminus HealthCheckResult` with `database.status=down` |

Health only checks the local server + DB. It does **not** call
PokeAPI.

### 3.4 Response schemas

`PokemonResponse` (success body for `POST /pokemon`):

```ts
interface PokemonResponse {
  id: number; // PokeAPI id (positive int)
  name: string; // normalized (lowercase, trimmed)
  height: number; // PokeAPI height (decimetres)
  weight: number; // PokeAPI weight (hectograms)
  types: string[]; // array of type names, length >= 1
  createdAt: string; // ISO-8601 timestamp, always present
}
```

> `createdAt` is **required** in the public response. The
> frontend historically tolerated an absent value as a fallback;
> that fallback is no longer exercised against the current
> backend (see ADR `0010`).

> The frontend may still validate an intermediate shape with
> `types: [{ slot, type: { name, url } }]` (PokeAPI native) and
> project to `string[]` before reaching the domain. The contract
> that crosses the network remains `types: string[]`.

`ErrorResponse` (uniform error body — `HttpErrorFilter`):

```ts
interface ErrorResponse {
  statusCode: number; // HTTP status (mirror of response status)
  code: string; // stable uppercase code (see 3.5)
  message: string; // always a string in the public body
  timestamp: string; // ISO-8601, server time
  path: string; // request path
}
```

`message` is always a `string` in the response. Internal
validation details stay in logs, never the public body. The
filter applies public-safe messages from a static table for the
typed errors; the original message is kept in the log line with
`requestId`.

### 3.5 Error codes (stable, uppercase)

| `code`                 | HTTP | Source                              |
| ---------------------- | ---- | ----------------------------------- |
| `VALIDATION_ERROR`     | 400  | DTO validator (`class-validator`)   |
| `INVALID_POKEMON_NAME` | 400  | Domain name check (defensive)       |
| `POKEMON_NOT_FOUND`    | 404  | PokeAPI returned 404                |
| `POKEAPI_UNAVAILABLE`  | 502  | PokeAPI timeout or 5xx              |
| `POKEAPI_BAD_RESPONSE` | 502  | PokeAPI payload failed `zod` schema |
| `DATABASE_UNAVAILABLE` | 503  | Prisma read/write error             |
| `INTERNAL_ERROR`       | 500  | Any unhandled exception             |

The frontend `mapError` switches on `code` first, falls back to
`statusCode`. When the body **does not** match the error schema,
the frontend renders a human message keyed by `statusCode` (see
`FRONTEND.md` §6.3).

## 4. Concurrency

`POST /pokemon` uses `PrismaPokemonRepository.save()`, which calls
`prisma.pokemon.create(...)` and captures the unique-violation
code `P2002` on the `name` index. On conflict the repository
re-reads by `name` and returns the existing row with
`{ pokemon, created: false }`. If the re-read returns no row the
error propagates as `DATABASE_UNAVAILABLE`.

The frontend complements this with a single `POST /pokemon`
call. The backend handles duplicates via `P2002` recovery.

## 5. OpenAPI / Swagger

- JSON: `GET /docs-json` (used by CI to publish `openapi.json`).
- UI: `GET /docs`.
- Generated by `@nestjs/swagger` CLI plugin; decorators live in
  DTOs and controllers (see `BACKEND.md` §9).

## 6. Logging

`nestjs-pino` JSON logger. Every request log line includes:

- `requestId` (correlation id, generated per request; reused if
  the client sends `x-request-id`).
- `method`, `url`, `statusCode`, `durationMs` (managed by
  `pino-http`).
- For `POST /pokemon` success: `pokemonName` (normalized) and
  `outcome` (`created` | `existed`).
- Error path: `pino-http` log + `HttpErrorFilter` log with
  `requestId`, `code`, `message`, and (in non-production) the
  exception stack.

Secrets and raw request bodies are redacted
(`authorization`, `cookie`, `password`). No PII.

## 7. Coverage thresholds (global, per app)

| Metric     | Threshold |
| ---------- | --------- |
| lines      | ≥ 85      |
| statements | ≥ 85      |
| functions  | ≥ 85      |
| branches   | ≥ 80      |

Applied identically in Jest (backend) and Vitest (frontend).
Enforced in CI; a failed threshold fails the job.

Backend exclusions (see ADR `0006` and `apps/backend/jest.config.cjs`):

- `src/**/*.module.ts`
- `src/main.ts`
- `src/**/*.d.ts`
- `src/**/index.ts`
- `src/config/**`
- `src/**/PokemonResponse.ts`
- `src/**/PokemonTokens.ts`

Frontend exclusions (see ADR `0006`):

- `src/main.tsx`
- `src/app/**` (composition root + App)
- `src/test-setup.ts`
- `src/**/*.d.ts`
- `src/Contexts/Pokemon/ui/theme/**` (SVG and tokens)

## 8. Repository conventions (recap, see `STRUCTURE.md` for detail)

- One agent owner per path (see `EXECUTION.md` §4).
- Conventional Commits; one commit per phase on the phase branch.
- Trunk-based, base branch `main`. PR required to merge.
- Husky pre-commit runs `lint-staged` (ESLint + Prettier on
  changed files).

## 9. Change control

Anything in this document is a contract. To change it after
Phase 0:

1. Create a new ADR under `docs/adr/` describing the delta.
2. Update the affected agent's source doc (`BACKEND.md`,
   `FRONTEND.md`, ...).
3. Update `docs/CONTRACT.md` in the same PR.
4. Notify the integrator; merge only after the ADR is reviewed.

ADR `0011` is the canonical record of the as-built backend and
supersedes the plan for any point where the two disagree.
