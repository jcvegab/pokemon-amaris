# ADR 0011 — Backend as-built alignment

- **Status:** Accepted
- **Date:** 2026-07-16
- **Owner:** Backend
- **Source:** `docs/BACKEND.md` §3, §6, §8, §10, §12;
  `docs/CONTRACT.md` §3; `docs/STRUCTURE.md` §2, §7;
  `docs/adr/0003-arquitectura-hexagonal.md`;
  `docs/adr/0004-docker-compose.md`

## Context

Phase 2A landed with a layout and a set of identifiers that diverge
from the plan frozen in `docs/CONTRACT.md` and from the original
`BACKEND.md`. The documentation mix now contains three
inconsistencies that block onboarding and review:

1. **Layout.** The plan describes `src/pokemon/` and `src/shared/`.
   The code lives under `src/Contexts/Pokemon/` and
   `src/Contexts/Shared/`, plus the legacy top-level `src/health/`
   and `src/shared/health/` (kept for the health indicator outside
   the bounded contexts).
2. **Naming.** Class names, file names, DI tokens, error classes,
   and use-case name do not match. `CreatePokemonUseCase` is now
   `PokemonCreator`; `PokeapiPort` is `PokemonCatalog`;
   `PokeapiHttpAdapter` is `PokeApiPokemonCatalog`;
   `CreatePokemonDto` is `CreatePokemonRequest`;
   `PokemonController` is `PokemonPostController`. The DI uses
   `Symbol` tokens exported from `PokemonTokens.ts`, not string
   identifiers.
3. **Runtime and contract deltas.** The backend compiles to
   CommonJS and consumes the workspace-root TypeScript `^5.7.2`
   (the original plan targeted ESM + TS 6.x). The persistence
   strategy is `create` plus `P2002` recovery, not Prisma `upsert`.
   The backend exposes only `POST /pokemon` and `GET /health`; the
   frontend sends only `POST` (ADR `0010` revised).

This ADR records the as-built reality and supersedes the affected
plan documents for those points.

## Decision

### Layout and naming

- Bounded context layout under `apps/backend/src/Contexts/`:
  - `Contexts/Pokemon/domain/` — entities, value objects, port
    `PokemonRepository`.
  - `Contexts/Pokemon/application/` — `create/PokemonCreator.ts`,
    `ports/PokemonCatalog.ts`, `errors/PokemonApplicationErrors.ts`.
  - `Contexts/Pokemon/infrastructure/` — `http/`,
    `persistence/prisma/`, `pokeapi/`, `dependency-injection/`.
  - `Contexts/Shared/infrastructure/` — `http/HttpErrorFilter.ts`
    and `persistence/prisma/{PrismaModule,PrismaService}.ts`.
- Top-level folders kept outside the contexts (intentional, see
  Consequences): `src/health/` and `src/shared/health/`.
- File naming: `PascalCase` for files exporting a class or value
  object (`Pokemon.ts`, `PokemonName.ts`, `PokemonCreator.ts`,
  `PokeApiPokemonCatalog.ts`). Folder names per layer are
  lower-case (`domain`, `application`, `infrastructure`).
- DI tokens are `Symbol` constants exported from
  `Contexts/Pokemon/infrastructure/dependency-injection/PokemonTokens.ts`:
  `POKEMON_REPOSITORY`, `POKEMON_CATALOG`, `POKEMON_CREATOR`.

### Runtime and configuration

- Backend `package.json` declares `"type": "commonjs"`.
  `tsconfig.json` overrides the base config to
  `module: "CommonJS"`, `moduleResolution: "Node"`,
  `verbatimModuleSyntax: false`, and enables
  `experimentalDecorators` + `emitDecoratorMetadata` for Nest.
- TypeScript version effective for backend is the workspace-root
  `^5.7.2`. The TS 6.x target from the plan is **not** reached;
  frontend remains the only consumer of TS 6.
- `env.schema.ts` validates the runtime config:
  - `PORT` is a positive integer (no upper bound enforced).
  - `DATABASE_URL` is a non-empty string (no `postgresql://`
    scheme check).
  - `POKEAPI_BASE_URL` is a URL.
  - `POKEAPI_TIMEOUT_MS` defaults to `5000`.
  - `LOG_LEVEL` defaults to `info`.

### Persistence and concurrency

- `PrismaPokemonRepository` implements `PokemonRepository`:
  - `findByName(name)` reads by `name`.
  - `save(pokemon)` calls `prisma.pokemon.create(...)`. On
    `Prisma.PrismaClientKnownRequestError` with `code === 'P2002'`
    (unique violation on `name`), the repository performs
    `findByName` again and returns `{ pokemon, created: false }`.
  - Any other failure raises
    `PokemonPersistenceUnavailableError` (mapped to
    `503 DATABASE_UNAVAILABLE` by `HttpErrorFilter`).
- Concurrency safety: the `P2002` recovery path guarantees that
  two racing `POST /pokemon` requests for the same name leave a
  single row in the `pokemons` table. The repository re-reads the
  row to return the canonical `createdAt`.

### Error mapping

- Application errors live in
  `Contexts/Pokemon/application/errors/PokemonApplicationErrors.ts`:
  - `PokemonNotFoundError` → `404 POKEMON_NOT_FOUND`.
  - `PokemonCatalogUnavailableError` → `502 POKEAPI_UNAVAILABLE`.
  - `PokemonCatalogBadResponseError` → `502 POKEAPI_BAD_RESPONSE`.
  - `PokemonPersistenceUnavailableError` →
    `503 DATABASE_UNAVAILABLE`.
- `InvalidPokemonNameApplicationError` (declared in
  `PokemonCreator.ts`) maps to `400 INVALID_POKEMON_NAME`.
- `HttpErrorFilter` (under
  `Contexts/Shared/infrastructure/http/HttpErrorFilter.ts`)
  translates each error into the uniform
  `{ statusCode, code, message, timestamp, path }` body and
  applies public-safe messages via the `PUBLIC_ERROR_MESSAGES`
  table.

### HTTP surface

- `POST /pokemon` accepts `{ name }` or `{ pokemon }` and returns
  `201 Created` on first persist, `200 OK` on already-existing
  rows. The frontend only sends `POST`; duplicates are resolved
  by the backend via `P2002` recovery (ADR `0010` revised).
- `GET /health` runs `@nestjs/terminus` with
  `DatabaseHealthIndicator`; the indicator runs
  `prisma.$queryRaw\`SELECT 1\``and reports`database.status`.

### Dockerfile and bootstrap

- `apps/backend/Dockerfile` is multi-stage. The builder stage runs
  `pnpm install`, `prisma:generate` and `build`.
- The runtime stage installs runtime dependencies plus Prisma CLI,
  copies `apps/backend/prisma`, generates Prisma Client and starts
  only `node dist/main.js`.
- `docker-compose.yml` owns schema initialization through the
  one-shot `db-init` service. `db-init` runs
  `pnpm --filter @pokemon-amaris/backend prisma:push` and the
  backend waits for `service_completed_successfully`.
- The backend image no longer mutates the database in `CMD`.
- The healthcheck uses `wget -qO- http://127.0.0.1:3000/health`.

### Tests

- Jest config is `apps/backend/jest.config.cjs` (CommonJS
  project). The CLI runs via
  `node node_modules/jest/bin/jest.js --config jest.config.cjs`.
  No `jest.config.ts`, no `test:e2e` script.
- Coverage exclusions in addition to the default ignore list:
  `src/**/*.module.ts`, `src/main.ts`, `src/**/*.d.ts`,
  `src/**/index.ts`, `src/config/**`,
  `src/**/PokemonResponse.ts`, `src/**/PokemonTokens.ts`.
- Test file convention is `*.test.ts` (not `*.spec.ts`).
  Value-object tests live next to the implementation under
  `src/Contexts/Pokemon/domain/model/`.

## Consequences

Positive:

- The as-built tree, class names, and DI tokens are documented
  once and match the source.
- The contract becomes a single source of truth again:
  `POST /pokemon` + `GET /health`, `types: string[]`,
  `createdAt` required, concurrency via `P2002` recovery.
- `db-init` makes schema setup explicit in Compose and keeps backend
  runtime startup focused on serving HTTP.

Negative / costs:

- The original plan is partially invalidated. Future readers
  must read this ADR before trusting the plan documents.
- TypeScript 6 target is not yet reached on the backend. A
  follow-up ADR will be needed if/when the backend upgrades.
- `POST /pokemon` does not allow the frontend to skip the call on
  duplicates via a real `GET`; this is intentional and documented in
  ADR `0010`.

## Change control

- Plan documents that contradict this ADR must be aligned in the
  same PR that lands any code change to the affected area.
- A new ADR (`0012+`) is required to add new HTTP routes, switch
  the backend to ESM, or upgrade the backend TypeScript version.
