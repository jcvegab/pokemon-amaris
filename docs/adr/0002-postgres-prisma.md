# ADR 0002 — PostgreSQL 17 + Prisma 5

- **Status:** Accepted (stub; full content in Phase 2C)
- **Source:** `docs/BACKEND.md` §2, §4

## Context

The service must persist Pokémon records retrieved from PokeAPI. The
candidate can pick any database (relational or not).

## Decision

- PostgreSQL 17 (`postgres:17-alpine` in Compose).
- Prisma 5.x as the ORM; client generated at build time.
- `prisma db push` for schema sync (no migrations, per `DEFINITION.md`).
- Schema: single `pokemons` table, `name` is `UNIQUE` to enable upsert.

## Consequences

- Idempotent writes via `upsertByName` handle concurrent requests.
- DB fallback in CI is impossible: tests must mock `PrismaClient`.
- The single-table design is sufficient for the scope; CQRS would be
  overkill (see ADR 0003).
