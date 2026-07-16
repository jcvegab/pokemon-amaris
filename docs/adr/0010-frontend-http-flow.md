# ADR 0010 — Frontend HTTP flow (contrato backend-only, abort parcial, mensajes)

- **Status:** Accepted (revised)
- **Source:** `docs/FRONTEND.md` §5.2, §6.3, §7, §8.1;
  `docs/CONTRACT.md` §3.4, §3.5; `docs/DIAGRAM.md` §3

## Context

`docs/CONTRACT.md` original define `POST /pokemon` como única
operación frontend y exige `types: string[]` en la respuesta. La
implementación construida en Fase 2B introduce tres desviaciones
funcionales que afectan al contrato observable del cliente.

## Decision

- El cliente envía `POST /pokemon` con `{ name }` normalizado. El
  backend distingue creación nueva de duplicado por su respuesta
  (`201` vs `200`).
- El schema `pokemonApiResponseSchema` valida solo la respuesta
  pública del backend: `types: string[]` y `createdAt` requerido.
  El frontend no acepta shapes de proveedores externos.
- `createdAt` es **obligatorio** en el contrato público. Se
  renderiza formateado en `es-PE` por `PokemonPresenter.formatDate`.
  El frontend no tolera ausencias: si la respuesta no trae
  `createdAt`, el mapper rechaza el payload como error de schema.
- El hook crea un `AbortController` por `submit` y descarta
  resultados tardíos comparando `controllerRef.current` y
  `isMountedRef.current`. El adaptador HTTP no recibe la señal:
  `combineSignals(undefined, timeoutMs)` solo compone el timeout.
  Cuando el hook aborta, el `fetch` puede seguir ejecutándose
  hasta completarse o hasta el timeout. El estado UI nunca se
  actualiza con datos obsoletos. Esta limitación se documenta
  como deuda.
- `PokemonApiErrorMapper.resolveMessage` preserva el `message` del
  backend si está presente. `resolveCode` prioriza `code` del
  backend (con tabla de mapeo) y cae a fallback por `statusCode`
  cuando el body no cumple el schema.

## Consequences

- El frontend queda acoplado al contrato público del backend, no al
  payload de proveedores externos. Si el backend cambia ese contrato, se
  requiere actualizar este ADR y el schema en la misma PR.
- `createdAt` siempre se muestra a partir de la fecha persistida
  por el backend. No hay fallback al reloj del cliente.
- La cancelación real del request queda pendiente. La
  implementación actual solo descarta respuestas tardías. Una
  mejora futura propagaría `AbortSignal` por
  `PokemonCreator.execute` → `PokemonRepository.create` →
  `ApiPokemonRepository.request`.
- Mensajes backend se muestran tal cual cuando cumplen el schema.
  El frontend no los sanitiza. Si el backend introduce PII o
  texto interno, se filtra al cliente. Se asume que el backend
  produce mensajes seguros (`HttpErrorFilter`).

## Change control

- Añadir nuevas rutas backend o prechecks en el frontend requiere
  un nuevo ADR (propuesto `0012+`).
- Cambios al schema de respuesta público o a las exclusiones de
  cobertura del frontend se reflejan aquí y en `CONTRACT.md` en
  la misma PR.
