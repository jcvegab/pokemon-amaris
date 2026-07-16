# ADR 0003 — Hexagonal architecture (no CQRS)

- **Status:** Accepted
- **Source:** `docs/BACKEND.md` §2, §3, §7, §8; ADR `0009`

## Context

The challenge values clean architecture and clear layer separation.
The persistence layer must be swappable in tests (Prisma mocked), and
the external API (PokeAPI) must be replaceable without touching the
domain.

## Decision

- Hexagonal layout under `apps/backend/src/pokemon/`:
  - `domain/` — entities, value objects, ports (`PokemonRepository`,
    `PokeapiPort`).
  - `application/` — use cases, DTOs, mappers.
  - `infrastructure/` — Prisma repository, PokeAPI HTTP adapter.
  - `interfaces/http/` — controllers and response shapes.
- No CQRS: read and write go through the same use case. The duplicate
  path is just a fast read of the existing row.
- DI: ports injected as tokens (`'PokeapiPort'`, `'PokemonRepository'`)
  to make mocking trivial.

## Consequences

- Tests run without PostgreSQL or network; everything is mocked.
- The `CreatePokemonUseCase` is the single place that knows about the
  read-then-write sequence.
- Domain code never imports from `@nestjs/*`, `@prisma/client`, or
  `axios`. Easier to test, easier to swap.
- The frontend adopts an analogous contextual layout documented in
  ADR `0009` (`Contexts/Pokemon/{domain, application,
infrastructure, ui}`). Both sides use the same idea of ports and
  adapters, but the frontend has no DI container: the composition
  root is a plain function in `src/app/composition-root.ts`.
