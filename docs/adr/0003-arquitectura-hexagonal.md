# ADR 0003 — Hexagonal architecture (no CQRS)

- **Status:** Accepted (stub; full content in Phase 2C)
- **Source:** `docs/BACKEND.md` §2, §3, §7, §8

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
