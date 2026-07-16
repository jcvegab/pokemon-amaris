# ADR 0010 — Flujo HTTP frontend (GET previo, DTO PokéAPI, abort parcial)

- **Status:** Accepted
- **Source:** `docs/FRONTEND.md` §5.2, §6.3, §7, §8.1;
  `docs/CONTRACT.md` §3.2, §3.4, §3.5;
  `docs/DIAGRAM.md` §3

## Context

`docs/CONTRACT.md` original define `POST /pokemon` como única
operación frontend y exige `types: string[]` en la respuesta. La
implementación construida en Fase 2B introduce tres desviaciones
funcionales que afectan al contrato observable del cliente:

1. El caso de uso `PokemonCreator` ejecuta
   `GET /pokemon/:name` antes de `POST /pokemon` para detectar
   duplicados sin invocar PokeAPI.
2. La respuesta de éxito se valida con un DTO estilo PokéAPI
   (`types: [{ slot, type: { name, url } }]`), no con `string[]` a
   nivel HTTP. El mapper proyecta `types` a `string[]` antes de
   llegar a la entidad de dominio.
3. `createdAt` se trata como opcional: si el body no lo trae, el
   cliente usa `new Date().toISOString()` como fallback.
4. El `AbortController` del hook descarta resultados tardíos pero
   no se inyecta en `ApiPokemonRepository.request()`; el `fetch`
   en vuelo no se cancela.
5. `PokemonApiErrorMapper` preserva el `message` del backend cuando
   el body encaja en el schema de error, y solo usa la tabla de
   fallback humano cuando no.

## Decision

- `GET ${VITE_API_BASE_URL}/pokemon/:name` se ejecuta antes del
  `POST` con el nombre normalizado. Si responde `200`, el hook
  emite el estado `success` con `created: false` sin llamar al
  `POST`. Si responde `404`, se llama al `POST`. Otros errores
  fluyen al mapper de errores. Esta ruta evita que la primera vez
  que un usuario repite un nombre dispare un `POST` que terminaría
  siendo un `200` con `upsert`.
- El schema `pokeApiPokemonDtoSchema` valida la forma PokéAPI y el
  mapper `PokemonApiMapper.toSnapshot` proyecta `types` a
  `string[]`. La respuesta pública sigue siendo `types: string[]`
  para el dominio y la UI; el shape PokéAPI vive solo en la
  capa de infraestructura.
- `createdAt` se extrae por separado (`extractCreatedAt`) y se
  tolera ausente. `Pokemon.fromSnapshot` rechaza fechas inválidas.
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

- La UI evita un `POST` cuando el Pokémon ya está persistido,
  reduciendo tráfico a PokeAPI. El backend debe exponer
  `GET /pokemon/:name`; si no lo expone, el frontend verá `404` y
  continuará con el `POST` (degradación controlada).
- El frontend tolera un body con `types` anidado o plano. Si el
  backend cambia la forma intermedia (p. ej. a `string[]` directo),
  el schema seguirá aceptándolo con un cambio mínimo.
- `createdAt` puede diferir del persistido si el backend no lo
  retorna; la UI muestra la fecha del fallback. Si el contrato
  exige `createdAt` obligatorio, esta rama deja de aplicar.
- La cancelación real del request queda pendiente. La
  implementación actual solo descarta respuestas tardías. Una
  mejora futura propagaría `AbortSignal` por
  `PokemonCreator.execute` → `PokemonRepository.{findByName,
create}` → `ApiPokemonRepository.request`.
- Mensajes backend se muestran tal cual cuando cumplen el schema.
  El frontend no los sanitiza. Si el backend introduce PII o
  texto interno, se filtra al cliente. Se asume que el backend
  produce mensajes seguros (`HttpErrorFilter`).
- `CONTRACT.md` se actualiza para registrar
  `GET /pokemon/:name`, las exclusiones de cobertura del frontend
  y la nota sobre `createdAt` opcional. `FRONTEND.md` describe la
  implementación tal cual.
