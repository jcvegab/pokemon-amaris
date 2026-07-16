# ADR 0006 — Coverage threshold 85% / 80%

- **Status:** Accepted
- **Source:** `apps/backend/jest.config.cjs`;
  `apps/frontend/vitest.config.ts`; `.github/workflows/ci.yml`; ADR `0011`

## Context

The challenge awards extra points for tests "above 85%". We want a
single, enforceable threshold that applies to both backend and frontend
and fails CI if violated.

## Decision

- Global threshold per app:
  - `lines` ≥ 85
  - `statements` ≥ 85
  - `functions` ≥ 85
  - `branches` ≥ 80
- Backend: enforced in `apps/backend/jest.config.cjs` via
  `coverageThreshold.global` (CommonJS project, no `jest.config.ts`).
- Frontend: enforced in `apps/frontend/vitest.config.ts` via
  `coverage.thresholds`.
- CI publishes the `coverage/` folder of each app as an artefact so
  reviewers can drill in.
- Backend exclusions (`apps/backend/jest.config.cjs`):
  - `src/**/*.module.ts`: Nest module wiring.
  - `src/main.ts`: bootstrap.
  - `src/**/*.d.ts`: type declarations.
  - `src/**/index.ts`: barrel files.
  - `src/config/**`: runtime configuration loader.
  - `src/**/PokemonResponse.ts`: pure data shape for Swagger.
  - `src/**/PokemonTokens.ts`: only `Symbol` constants.
- Frontend exclusions (`apps/frontend/vitest.config.ts`):
  - `src/main.tsx`: bootstrap de React.
  - `src/app/**`: composition root + `App` (cableado manual, sin
    lógica de negocio).
  - `src/test-setup.ts`: registro de matchers de Testing Library.
  - `src/**/*.d.ts`: declaraciones de tipos.
  - `src/Contexts/Pokemon/ui/theme/**`: SVG y tokens visuales
    (`Pokeball.tsx`, `PokemonBadge.tsx`, `tokens.ts`).

## Consequences

- The threshold is uniform across apps, so the test effort is
  comparable.
- Branches at 80% leaves a small gap for uninteresting edges (default
  switches, defensive `null` checks). Lines/statements/functions at
  85% catches real gaps.
- Dropping below the threshold fails the job; no soft warnings.
- El frontend mide la cobertura sobre los archivos productivos
  (dominio, aplicación, infraestructura, UI lógica). Quedan fuera
  los archivos puramente visuales y de cableado, que se prueban
  manualmente o mediante tests de integración que ya cuentan para
  la cobertura del hook, presenter y componentes.
- La cobertura backend excluye los archivos de cableado de Nest
  (módulos, bootstrap) y de configuración; los flujos de
  aplicación (`PokemonCreator`, adaptadores, filtros) y de
  dominio (entidades, value objects) sí se miden.
