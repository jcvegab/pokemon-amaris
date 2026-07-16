# CONTRACT — Phase 0 (con extensiones de Fase 2B)

Single source of truth for HTTP contract, env vars, and pinned
versions. Frozen at the end of Phase 0. Any change after that
requires an ADR.

> Este documento incorpora extensiones registradas en:
>
> - **ADR 0009** — arquitectura contextual frontend.
> - **ADR 0010** — flujo HTTP frontend (`GET /pokemon/:name` previo al
>   `POST`, DTO con `types` anidado estilo PokéAPI,
>   `createdAt` opcional, preservación de `message` del backend).

## 1. Pinned versions

| Tool          | Version | Notes                                     |
| ------------- | ------- | ----------------------------------------- |
| Node          | `24.x`  | LTS line; pinned via `.nvmrc`.            |
| pnpm          | `10.x`  | Workspaces; pinned via `packageManager`.  |
| TypeScript    | `6.x`   | Strict; extends `tsconfig.base.json`.     |
| NestJS        | `11.x`  | Last stable compatible with Node 24.      |
| Prisma        | `5.x`   | `prisma-client-js`, no migrations (push). |
| React         | `19.x`  | Concurrent rendering; no SSR.             |
| Vite          | `5.x`   | Dev server + `build`.                     |
| Tailwind CSS  | `4.x`   | Via `@tailwindcss/vite` plugin.           |
| PostgreSQL    | `17`    | `postgres:17-alpine` en Compose.          |
| Docker Engine | `>= 24` | Compose v2 plugin required.               |

If a pin must change after Phase 0, document in `docs/adr/` and bump
the ADR index in `docs/adr/README.md`.

> El workspace raíz fija `typescript@^5.7.2`; `apps/frontend` consume
> `typescript@^6.0.0`. La divergencia se tolera y se documenta en el
> ADR 0001 al actualizar.

## 2. Environment variables

| Variable              | Owner    | Required         | Default     | Validation                               |
| --------------------- | -------- | ---------------- | ----------- | ---------------------------------------- |
| `NODE_ENV`            | backend  | no               | development | `development` \| `test` \| `production`  |
| `PORT`                | backend  | no               | `3000`      | `1..65535` (coerced int)                 |
| `DATABASE_URL`        | backend  | yes              | —           | URL with `postgresql://` scheme          |
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

Host port mapping (defined in `docker-compose.yml`, **not** in `.env`):

| Service    | Host port | Container port |
| ---------- | --------- | -------------- |
| `db`       | `5432`    | `5432`         |
| `backend`  | `3000`    | `3000`         |
| `frontend` | `8080`    | `80` (nginx)   |

Conventions:

- `PORT` is the internal backend var. Host ports live in Compose.
- `VITE_API_BASE_URL=/api` so the client always hits the same path in
  dev (Vite proxy) and prod (Nginx proxy). No CORS.

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
| `400`  | Body invalid (missing name, both fields, extra field, bad shape) | `ErrorResponse` (`VALIDATION_ERROR`)                              |
| `404`  | PokeAPI returned `404` for the given name                        | `ErrorResponse` (`POKEMON_NOT_FOUND`)                             |
| `502`  | PokeAPI timeout, `5xx`, or payload failed `zod` validation       | `ErrorResponse` (`POKEAPI_UNAVAILABLE` \| `POKEAPI_BAD_RESPONSE`) |
| `503`  | DB read/write failure                                            | `ErrorResponse` (`DATABASE_UNAVAILABLE`)                          |
| `500`  | Unexpected error                                                 | `ErrorResponse` (`INTERNAL_ERROR`)                                |

Important: when the Pokémon already exists, **no** outbound call is
made to PokeAPI. The persisted record is returned as-is (same
`createdAt`).

### 3.2 `GET /pokemon/:name`

Lectura previa al `POST` (ver ADR `0010`). El frontend consume este
endpoint para detectar duplicados sin invocar PokeAPI cuando el
Pokémon ya está persistido.

Request:

- Path param `name`: nombre normalizado (`^[a-z0-9-]+$`, 1..50).

Responses:

| Status | When                                          | Body shape                               |
| ------ | --------------------------------------------- | ---------------------------------------- |
| `200`  | Pokémon existe en DB; se devuelve el registro | `PokemonResponse`                        |
| `404`  | Pokémon no existe en DB y PokeAPI tampoco     | `ErrorResponse` (`POKEMON_NOT_FOUND`)    |
| `502`  | PokeAPI timeout/5xx/payload inválido          | `ErrorResponse` (`POKEAPI_*`)            |
| `503`  | DB no consultable                             | `ErrorResponse` (`DATABASE_UNAVAILABLE`) |

> Si el backend aún no expone `GET /pokemon/:name` (Fase 2A
> pendiente), el frontend verá `404` y continuará con el `POST`. Ver
> `apps/backend/README.md` para el estado del endpoint.

### 3.3 `GET /health`

No body, no params.

| Status | When                                        | Body shape                                               |
| ------ | ------------------------------------------- | -------------------------------------------------------- |
| `200`  | App responsive and DB queryable             | `Terminus HealthCheckResult` with `database.status=up`   |
| `503`  | DB not queryable (Prisma `$queryRaw` fails) | `Terminus HealthCheckResult` with `database.status=down` |

Health only checks the local server + DB. It does **not** call
PokeAPI.

### 3.4 Response schemas

`PokemonResponse` (success body for `POST /pokemon` and
`GET /pokemon/:name`):

```ts
interface PokemonResponse {
  id: number; // PokeAPI id (positive int)
  name: string; // normalized (lowercase, trimmed)
  height: number; // PokeAPI height (decimetres)
  weight: number; // PokeAPI weight (hectograms)
  types: string[]; // array of type names, length >= 1
  createdAt: string; // ISO-8601 timestamp
}
```

> El frontend consume además un DTO intermedio estilo PokéAPI
> (`types: [{ slot, type: { name, url } }]`) que el mapper proyecta a
> `string[]`. El contrato público sigue siendo `types: string[]`
> (ver ADR `0010`).

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

`message` is always a `string` in the response. Internal validation
details stay in logs, never the public body.

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
`statusCode`. Cuando el body **no** cumple el schema de error, el
frontend muestra un mensaje humano por `statusCode` (tabla en
`FRONTEND.md` §6.3).

## 4. Concurrency

`POST /pokemon` uses Prisma `upsert` keyed on `name`. If two requests
arrive concurrently for the same name, the second one observes an
existing row and the controller returns `200 OK` with the same
`createdAt`.

El frontend complementa con un `GET /pokemon/:name` previo. Si el
GET responde `200`, el frontend muestra el resultado sin invocar
el `POST`. Esto evita tráfico innecesario hacia PokeAPI cuando el
Pokémon ya está persistido (ver ADR `0010`).

## 5. OpenAPI / Swagger

- JSON: `GET /docs-json` (used by CI to publish `openapi.json`).
- UI: `GET /docs`.
- Generated by `@nestjs/swagger` CLI plugin; decorators live in DTOs
  and controllers (see `BACKEND.md` §9).

## 6. Logging

`nestjs-pino` JSON logger. Every request log line includes:

- `requestId` (correlation id, generated per request).
- `method`, `url`, `statusCode`, `durationMs`.
- For `POST /pokemon` / `GET /pokemon/:name`: `pokemonName`
  (normalized) and `outcome` (`created` | `existed` |
  `validation_error` | `not_found` | ...).

Secrets and raw request bodies are redacted. No PII.

## 7. Coverage thresholds (global, per app)

| Metric     | Threshold |
| ---------- | --------- |
| lines      | ≥ 85      |
| statements | ≥ 85      |
| functions  | ≥ 85      |
| branches   | ≥ 80      |

Applied identically in Jest (backend) and Vitest (frontend). Enforced
in CI; a failed threshold fails the job.

Frontend exclusions (ver ADR `0006`):

- `src/main.tsx`
- `src/app/**` (composition root + App)
- `src/test-setup.ts`
- `src/**/*.d.ts`
- `src/Contexts/Pokemon/ui/theme/**` (SVG y tokens)

## 8. Repository conventions (recap, see `STRUCTURE.md` for detail)

- One agent owner per path (see `EXECUTION.md` §4).
- Conventional Commits; one commit per phase on the phase branch.
- Trunk-based, base branch `main`. PR required to merge.
- Husky pre-commit runs `lint-staged` (ESLint + Prettier on changed
  files).

## 9. Change control

Anything in this document is a contract. To change it after Phase 0:

1. Create a new ADR under `docs/adr/` describing the delta.
2. Update the affected agent's source doc (`BACKEND.md`,
   `FRONTEND.md`, ...).
3. Update `docs/CONTRACT.md` in the same PR.
4. Notify the integrator; merge only after the ADR is reviewed.
