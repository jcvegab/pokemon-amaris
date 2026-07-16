# ADR 0002 — PostgreSQL 17 + Prisma 5

- **Status:** Accepted
- **Source:** `docs/BACKEND.md` §2, §4; `docs/adr/0011-backend-as-built-alignment.md`

## Context

The service must persist Pokémon records retrieved from PokeAPI. The
candidate can pick any database (relational or not).

## Decision

- PostgreSQL 17 (`postgres:17-alpine` in Compose).
- Prisma 5.22 as the ORM; client generated at build time.
- `prisma db push` for schema sync (no migrations, per
  `DEFINITION.md`). The backend runtime also runs `prisma db push`
  in its `CMD` (see ADR `0011`).
- Schema: single `pokemons` table, `name` is `UNIQUE` to make
  concurrent writes recoverable.

## Consequences

- Concurrent writes are safe through `INSERT + catch P2002 +
SELECT by name` in `PrismaPokemonRepository.save()` (ADR
  `0011`). Two racing `POST /pokemon` requests for the same
  name leave a single row and the second responds `200 OK` with
  the canonical `createdAt`.
- DB fallback in CI is impossible: tests must mock `PrismaClient`
  (and the integration suite substitutes the
  `POKEMON_REPOSITORY` token with an in-memory double).
- The single-table design is sufficient for the scope; CQRS would
  be overkill (see ADR `0003`).
