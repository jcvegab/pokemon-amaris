# ADR 0009 — Arquitectura contextual frontend (domain / application / infrastructure / ui)

- **Status:** Accepted
- **Source:** `docs/FRONTEND.md` §2, §3, §5; `docs/CONTRACT.md` §3;
  `docs/STRUCTURE.md` §7

## Context

`apps/frontend/` agrupa una SPA React 19 que consume el backend de
Pokémon. La separación de capas existente en
`apps/backend/src/pokemon/` (ADR `0003`) es la base conceptual del
proyecto, pero el plan original proponía para el frontend un layout
plano (`src/api`, `src/components`, `src/hooks`, `src/lib`).

La implementación actual adopta un patrón equivalente al backend
organizado por **bounded context**: cada contexto agrupa
`domain` (entidades, value objects, errores), `application`
(casos de uso, puertos), `infrastructure` (adaptadores HTTP,
schemas, mappers) y `ui` (componentes, hooks, presenters, tema).
Las dependencias apuntan hacia adentro (UI → application → port ←
infrastructure → domain), igual que en backend.

## Decision

- `src/Contexts/Pokemon/` agrupa las cuatro capas del contexto
  principal.
  - `domain/model/Pokemon.ts`, `PokemonName.ts`, `PokemonError.ts`.
  - `application/create/PokemonCreator.ts` (caso de uso).
  - `application/ports/PokemonRepository.ts` (puerto).
  - `infrastructure/api/ApiPokemonRepository.ts` (adaptador HTTP).
  - `infrastructure/api/PokemonApiSchema.ts`,
    `PokemonApiMapper.ts`, `PokemonApiErrorMapper.ts` (schemas,
    mappers, errores).
  - `ui/` agrupa `components/`, `hooks/`, `pages/`, `presenters/`,
    `state/`, `theme/`.
- `src/Contexts/Shared/infrastructure/` contiene capacidades
  cross-context:
  - `config/env.ts` (validación de `import.meta.env`).
  - `http/httpErrors.ts` (`HttpError`, `NetworkError`,
    `RequestAbortedError`, `combineSignals`).
- `src/app/` contiene el composition root
  (`composition-root.ts`) y `App.tsx`. Instancia el repositorio HTTP
  y se lo inyecta al caso de uso.
- `test/doubles/InMemoryPokemonRepository.ts` implementa el puerto
  para tests sin red.
- El estado de UI se modela como unión discriminada en
  `ui/state/CreatePokemonState.ts`.

Convención de naming documentada:

- Carpetas de bounded context: `PascalCase` (`Contexts/Pokemon`).
- Archivos de capa: `PascalCase` cuando exportan una clase, entidad
  o componente principal (`Pokemon.ts`, `PokemonForm.tsx`).
- Alias `@/...` configurado para código nuevo; el código actual
  utiliza imports relativos dentro del mismo contexto.

## Consequences

- El frontend puede mockear el puerto en tests sin tocar la red ni
  reescribir el caso de uso. La suite de integración usa
  `InMemoryPokemonRepository` para verificar la UI completa.
- El adaptador HTTP queda aislado: cambiar a otro transporte (gRPC,
  GraphQL) implica escribir un nuevo `*Repository` y modificar solo
  el composition root.
- Los tests del composition root y de `App` quedan fuera de la
  cobertura (ver ADR `0006`); el resto del código se cubre
  globalmente.
- `Contexts/Shared` escala a nuevos contextos (p. ej. `User`,
  `Session`) sin reorganizar la raíz.
- ADR `0003` (hexagonal backend) y este ADR son gemelos: ambos
  aplican la misma idea de puertos y adaptadores en su respectivo
  runtime. La diferencia es que el frontend no usa CQRS ni DI por
  tokens; el composition root es manual y los puertos se inyectan
  por constructor.
