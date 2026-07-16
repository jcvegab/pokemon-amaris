# ADR 0003 — Hexagonal architecture (no CQRS)

- **Status:** Accepted
- **Source:** `apps/backend/src/Contexts/Pokemon/**`; ADR `0009`;
  ADR `0011`

## Context

The challenge values clean architecture and clear layer separation.
The persistence layer must be swappable in tests (Prisma mocked), and
the external API (PokeAPI) must be replaceable without touching the
domain.

## Decision

- Hexagonal layout under `apps/backend/src/Contexts/Pokemon/`:
  - `domain/` — entities, value objects, port `PokemonRepository`.
  - `application/` — use case (`create/PokemonCreator.ts`),
    port (`ports/PokemonCatalog.ts`),
    typed errors (`errors/PokemonApplicationErrors.ts`).
  - `infrastructure/` — Prisma repository
    (`persistence/prisma/PrismaPokemonRepository.ts`),
    PokeAPI HTTP adapter
    (`pokeapi/PokeApiPokemonCatalog.ts`,
    `PokeApiHttpModule.ts`, `PokeApiPokemonSchema.ts`,
    `PokeApiPokemonMapper.ts`),
    HTTP entry point
    (`http/PokemonPostController.ts`,
    `http/PokemonResponseMapper.ts`, `http/dto/*`).
  - `dependency-injection/` — `PokemonModule.ts` and
    `PokemonTokens.ts` (DI tokens).
- `apps/backend/src/Contexts/Shared/infrastructure/` carries the
  cross-context plumbing: `http/HttpErrorFilter.ts` and
  `persistence/prisma/{PrismaModule,PrismaService}.ts`.
- The legacy `src/health/` and `src/shared/health/` folders are
  kept outside the bounded contexts. The `DatabaseHealthIndicator`
  depends on `Contexts/Shared/.../PrismaService` and is wired by
  `src/health/health.module.ts` (see ADR `0011`).
- No CQRS: read and write go through the same use case
  (`PokemonCreator.execute`). The duplicate path is a fast read
  of the existing row.
- DI: ports injected as `Symbol` tokens
  (`POKEMON_REPOSITORY`, `POKEMON_CATALOG`, `POKEMON_CREATOR`)
  exported from `PokemonTokens.ts`; this makes mocking trivial
  and avoids stringly-typed identifiers.

## Consequences

- Tests run without PostgreSQL or network; everything is mocked.
  Integration tests substitute the tokens with
  `InMemoryPokemonRepository` and `FakePokemonCatalog`.
- `PokemonCreator` is the single place that knows about the
  read-then-write sequence.
- Domain code never imports from `@nestjs/*`, `@prisma/client`, or
  `axios`. Easier to test, easier to swap.
- The frontend adopts an analogous contextual layout documented in
  ADR `0009` (`Contexts/Pokemon/{domain, application,
infrastructure, ui}`). Both sides use the same idea of ports and
  adapters, but the frontend has no DI container: the composition
  root is a plain function in `src/app/composition-root.ts`.
