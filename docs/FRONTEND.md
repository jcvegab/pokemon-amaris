# FRONTEND — implementación

## 1. Objetivo

Construir la SPA en React 19 con Vite y Tailwind 4 que consume el
endpoint del backend (`POST /pokemon`), gestiona los estados de
carga, éxito y error, y refleja los resultados con mensajes
comprensibles.

> Este documento describe el código construido en
> `apps/frontend/`, no el plan original. Cambios respecto a
> `docs/CONTRACT.md` y `docs/STRUCTURE.md` se justifican en los ADRs
> `0009` (arquitectura contextual) y `0010` (contrato backend-only,
> abort parcial, preservación de `message` del backend).
> El estado del backend (CommonJS, persistencia vía `P2002`) se
> documenta en el ADR `0011`.

## 2. Decisiones técnicas

| Aspecto            | Decisión                                                                           |
| ------------------ | ---------------------------------------------------------------------------------- |
| Framework          | React 19 (`StrictMode` activo)                                                     |
| Build tool         | Vite 5                                                                             |
| Lenguaje           | TypeScript 6.x (extiende `tsconfig.base.json`)                                     |
| Estilos            | Tailwind CSS 4 (`@tailwindcss/vite`, `@import 'tailwindcss'`, `@theme`)            |
| Cliente HTTP       | `fetch` nativo con `AbortController` y timeout por request                         |
| Formularios        | Un único input que envía `{ name }`                                                |
| Estado servidor    | Local; un hook propio controla la transición `idle / loading / success / error`    |
| Router             | No requerido (SPA de una vista)                                                    |
| Arquitectura       | Contextual: `domain` / `application` / `infrastructure` / `ui` por bounded context |
| Composition root   | Manual, en `src/app/composition-root.ts`                                           |
| Tests              | Vitest + Testing Library + jsdom                                                   |
| Cobertura objetivo | ≥ 85% (líneas, statements, funciones); branches ≥ 80%                              |
| Accesibilidad      | Roles ARIA, foco visible, etiquetas asociadas                                      |
| Temática           | Pokédex sencilla (paleta rojo/blanco/negro/amarillo, pokébola SVG, ficha)          |

## 3. Layout de `apps/frontend`

```
apps/frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── index.css
│   ├── test-setup.ts
│   ├── app/
│   │   ├── App.tsx
│   │   └── composition-root.ts
│   └── Contexts/
│       ├── Shared/
│       │   └── infrastructure/
│       │       ├── config/
│       │       │   └── env.ts
│       │       └── http/
│       │           └── httpErrors.ts
│       └── Pokemon/
│           ├── domain/
│           │   └── model/
│           │       ├── Pokemon.ts
│           │       ├── PokemonName.ts
│           │       └── PokemonError.ts
│           ├── application/
│           │   ├── create/
│           │   │   └── PokemonCreator.ts
│           │   └── ports/
│           │       └── PokemonRepository.ts
│           ├── infrastructure/
│           │   └── api/
│           │       ├── ApiPokemonRepository.ts
│           │       ├── PokemonApiSchema.ts
│           │       ├── PokemonApiMapper.ts
│           │       └── PokemonApiErrorMapper.ts
│           └── ui/
│               ├── components/
│               │   ├── PokemonForm.tsx
│               │   ├── PokemonResult.tsx
│               │   └── StatusBanner.tsx
│               ├── hooks/
│               │   └── useCreatePokemon.ts
│               ├── pages/
│               │   └── HomePage.tsx
│               ├── presenters/
│               │   └── PokemonPresenter.ts
│               ├── state/
│               │   └── CreatePokemonState.ts
│               └── theme/
│                   ├── Pokeball.tsx
│                   ├── PokemonBadge.tsx
│                   └── tokens.ts
├── test/
│   ├── doubles/
│   │   └── InMemoryPokemonRepository.ts
│   ├── integration/
│   │   ├── HomePage.test.tsx
│   │   └── HomePageFlow.test.tsx
│   └── unit/
│       ├── ApiPokemonRepository.test.ts
│       ├── Pokemon.test.ts
│       ├── PokemonApiErrorMapper.test.ts
│       ├── PokemonApiSchema.test.ts
│       ├── PokemonCreator.test.ts
│       ├── PokemonError.test.ts
│       ├── PokemonForm.test.tsx
│       ├── PokemonName.test.ts
│       ├── PokemonPresenter.test.ts
│       ├── PokemonResult.test.tsx
│       ├── StatusBanner.test.tsx
│       └── httpErrors.test.ts
├── .env.example
├── Dockerfile
├── nginx.conf
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

Convenciones observadas:

- `Contexts/` en `PascalCase` (excepción documentada en
  `STRUCTURE.md` §7 y ADR `0009`).
- Archivos de capa en `PascalCase`; tests en `kebab-case` solo cuando
  describen la unidad probada (no se aplica aquí).
- `test/` separado de `src/`; los tests no viven junto al código.
- No existe `tailwind.config.ts`; la configuración está en
  `vite.config.ts` (plugin) y `src/index.css` (`@import 'tailwindcss'`,
  `@theme`, `@layer`).

## 4. Variables de entorno

`apps/frontend/.env.example`:

```env
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT_MS=8000
```

Validación en `src/Contexts/Shared/infrastructure/config/env.ts` con
`zod`. La variable se evalúa en build-time porque Vite la expone vía
`import.meta.env`.

Reglas:

- `VITE_API_BASE_URL` debe empezar con `/` o ser una URL absoluta;
  default `/api`.
- `VITE_API_TIMEOUT_MS` es entero positivo en milisegundos; default
  `8000`.

> El frontend siempre llama a `${VITE_API_BASE_URL}/pokemon`. En
> desarrollo, el dev server de Vite proxifica `/api/*` a
> `http://localhost:3000`. En Docker, Nginx proxifica `/api/*` a
> `http://backend:3000`. Esto evita CORS y mantiene el código del
> cliente idéntico entre entornos.

## 5. Arquitectura por capas

`src/Contexts/Pokemon/` sigue un patrón contextual inspirado en
arquitectura hexagonal, sin CQRS:

```text
ui/                         # Componentes, hooks, presenters, tema
  ↓ depende de
application/                # Casos de uso + puertos
  ↓ depende de
domain/                     # Entidades, value objects, errores (no depende de nada)
  ↑ implementa
infrastructure/             # Adaptadores (HTTP, mappers, schemas)
```

- `domain/model/Pokemon.ts`: entidad inmutable con `fromSnapshot`.
- `domain/model/PokemonName.ts`: value object con normalización
  (`trim` + `toLowerCase`) y validación de patrón.
- `domain/model/PokemonError.ts`: jerarquía de errores tipados por
  código (`INVALID_INPUT`, `VALIDATION_ERROR`, `POKEMON_NOT_FOUND`,
  `POKEAPI_UNAVAILABLE`, `POKEAPI_BAD_RESPONSE`,
  `DATABASE_UNAVAILABLE`, `NETWORK_ERROR`, `UNEXPECTED_ERROR`,
  `INTERNAL_ERROR`).
- `application/ports/PokemonRepository.ts`: contrato
  `create(name)` (única operación; el frontend no consulta antes de
  enviar).
- `application/create/PokemonCreator.ts`: caso de uso único;
  normaliza el nombre y delega en `create`. Duplicados los resuelve
  el backend con `P2002` recovery (ADR `0011`); el frontend
  interpreta `200` y `201` sin distinguir la fuente.
- `infrastructure/api/`: adaptador `ApiPokemonRepository` que cumple
  el puerto, más schemas `zod`, mapper y mapeo de errores HTTP a
  `PokemonError`.
- `ui/`: `HomePage` orquesta `PokemonForm`, `StatusBanner` y
  `PokemonResult`. `useCreatePokemon` consume el caso de uso.

`Contexts/Shared/infrastructure/` agrupa capacidades cross-context:

- `config/env.ts`: parsing y validación de `import.meta.env`.
- `http/httpErrors.ts`: tipos `HttpError`, `NetworkError`,
  `RequestAbortedError` y `combineSignals` para componer timeout y
  abort externo.

### 5.1 Composition root

`src/app/composition-root.ts` instancia el repositorio HTTP, lo
inyecta en el caso de uso y devuelve `{ pokemonCreator }`. `App.tsx`
pasa `pokemonCreator` a `HomePage`. Los tests usan un doble en
memoria (`InMemoryPokemonRepository`) en lugar del adaptador HTTP.

### 5.2 Estado del hook

`src/Contexts/Pokemon/ui/state/CreatePokemonState.ts` define una
unión discriminada:

```ts
type CreatePokemonState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; pokemon: Pokemon }
  | { status: 'error'; message: string; code: string };
```

`useCreatePokemon(creator)` expone `{ state, input, setInput,
submit, reset, abort }`. Maneja su propio `AbortController` para
descartar resultados tardíos, pero **no** propaga la señal al
adaptador HTTP (ver ADR `0010`).

## 6. UI

### 6.1 Componentes

- `HomePage`: tarjeta Pokédex con cabecera, formulario, banner y
  resultado. Maneja el error local de input vacío.
- `PokemonForm`: input controlado/no-controlado, `maxLength=50`,
  `aria-busy` durante la carga, botón con pokébola animada.
- `StatusBanner`: muestra `idle / loading / success / error` con
  clases y `aria-live` adecuados.
- `PokemonResult`: tarjeta estilo ficha con `displayName`,
  `pokedexNumber` (`#025`), altura en metros, peso en kilogramos,
  tipos como chips de color y `createdAt` localizado en `es-PE`.

### 6.2 Tema

Definido en `src/index.css` con `@theme` y `@layer components`:

- Paleta: `--color-pokedex-red`, `--color-pokedex-red-dark`,
  `--color-pokedex-yellow`, `--color-pokedex-black`,
  `--color-pokedex-white`.
- Clases reutilizables: `.pokedex-card`, `.pokedex-header`,
  `.pokedex-led`, `.field`, `.btn-primary`.
- Animación CSS `pokeball-spin` (usada por `Pokeball` con
  `animation` inline).
- `pokeball` SVG inline (`Pokeball.tsx`).
- `pokemon-badge` con paleta por tipo (`PokemonBadge.tsx`).
- `TOKENS` numéricos en `theme/tokens.ts` (padding de número Pokédex,
  duración del spinner, longitud máxima del input).

Sin imágenes externas; todo es SVG inline o CSS. `prefers-color-scheme`
se respeta mediante `dark:` utilities. Diseño responsive: `max-w-md
mx-auto`, padding generoso, foco visible con `ring-2` amarillo.

### 6.3 Mensajes de error humanos

`PokemonApiErrorMapper` aplica el siguiente orden al mapear la
respuesta del backend:

1. Si el body encaja en el schema de error, traduce `code` (tabla
   `BACKEND_CODE_MAP`) a un código interno.
2. Si `code` no aparece en la tabla, conserva el `code` original si ya
   coincide con un código interno conocido; si no, usa el fallback por
   `statusCode`.
3. Si el body trae `message`, lo conserva (texto crudo del backend).
   Solo cuando el body **no** cumple el schema se usa la tabla de
   fallback por `statusCode`.

Tabla de fallback por `statusCode`:

| Código HTTP       | Mensaje                                              |
| ----------------- | ---------------------------------------------------- |
| 400               | "Revisa el nombre del Pokémon."                      |
| 404               | "No encontramos ese Pokémon. Verifica la escritura." |
| 502               | "No pudimos consultar la PokéAPI. Intenta de nuevo." |
| 503               | "El servicio no está disponible. Intenta más tarde." |
| Network / timeout | "Sin conexión. Revisa tu red."                       |
| Otro              | "Ocurrió un error inesperado."                       |

> Decisión registrada en ADR `0010`: se preserva el `message` del
> backend cuando viene bien formado, a costa de mostrar texto
> controlado por el backend.

## 7. Hook `useCreatePokemon`

`src/Contexts/Pokemon/ui/hooks/useCreatePokemon.ts`:

```ts
type UseCreatePokemonResult = {
  state: CreatePokemonState;
  input: string;
  setInput: (value: string) => void;
  submit: () => Promise<void>;
  reset: () => void;
  abort: () => void;
};

function useCreatePokemon(creator: PokemonCreator): UseCreatePokemonResult;
```

Responsabilidades:

- Guardar `input` controlado.
- Crear un `AbortController` por `submit`; cancelar el previo si
  `submit` se invoca de nuevo.
- Llamar a `creator.execute({ rawName: input })`.
- Si el componente se desmonta o la señal se canceló, descartar el
  resultado sin tocar el estado.
- En éxito: `{ status: 'success', pokemon }`.
- En error (`PokemonError` u otro `Error`): `{ status: 'error',
message, code }`. Errores abortados se ignoran.

Limitación actual: la señal no se inyecta en el adaptador HTTP. La
cancelación evita actualizar estado con respuestas tardías, pero el
`fetch` en vuelo no se aborta. Ver ADR `0010`.

## 8. Cliente API

`src/Contexts/Pokemon/infrastructure/api/ApiPokemonRepository.ts`
implementa `PokemonRepository` con `fetch`:

- `create(name)`:
  `POST ${baseUrl}/pokemon` con `{ name: name.value }`.
  - `201` → `{ created: true, pokemon }`.
  - `200` → `{ created: false, pokemon }`.
  - Otro status → `mapHttpErrorToPokemonError`.

`request()` combina timeout (`combineSignals(undefined, timeoutMs)`)
con el ciclo de `AbortController`. Errores de red se traducen a
`NetworkError`; aborts del usuario a `RequestAbortedError`.

### 8.1 DTO de respuesta (consumido por el frontend)

El schema `pokemonApiResponseSchema` valida solo la respuesta pública
del backend (ver ADR `0010`):

```ts
const pokemonApiResponseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  height: z.number().int().nonnegative(),
  weight: z.number().int().nonnegative(),
  types: z.array(z.string().min(1)).min(1),
  createdAt: z.string().min(1),
});
```

`createdAt` es obligatorio en el contrato público (ADR `0011`).
El mapper `PokemonApiMapper.toSnapshot` copia `types: string[]`
directamente; no acepta shapes de proveedores externos.

### 8.2 Schema de error

`backendErrorResponseSchema` valida el body de error uniforme
(`statusCode`, `code`, `message`, `timestamp?`, `path?`). Si el body
no encaja, el mapper cae a mensajes de fallback por `statusCode`.

## 9. Tipos de dominio

```ts
class PokemonName {
  readonly value: string; // normalizado
  constructor(value: string);
  equals(other: PokemonName): boolean;
}

class Pokemon {
  readonly id: number;
  readonly name: PokemonName;
  readonly height: number; // decímetros (PokeAPI)
  readonly weight: number; // hectogramos (PokeAPI)
  readonly types: readonly string[];
  readonly createdAt: Date;
  static fromSnapshot(snapshot): Pokemon;
}

type PokemonErrorCode =
  | 'INVALID_INPUT'
  | 'VALIDATION_ERROR'
  | 'POKEMON_NOT_FOUND'
  | 'POKEAPI_UNAVAILABLE'
  | 'POKEAPI_BAD_RESPONSE'
  | 'DATABASE_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'UNEXPECTED_ERROR'
  | 'INTERNAL_ERROR';

class PokemonError extends Error {
  readonly code: PokemonErrorCode;
  readonly statusCode?: number;
}
```

El presenter (`src/Contexts/Pokemon/ui/presenters/PokemonPresenter.ts`)
convierte la entidad a un `PokemonViewModel` para la UI:

- `formatHeight(dm)` → metros con 1 decimal.
- `formatWeight(hg)` → kilogramos con 1 decimal.
- `formatPokedexNumber(id)` → `#025` (padding a 3).
- `formatDate(iso)` → `es-PE` con `dateStyle: medium`, `timeStyle:
short`.
- `capitalize(value)` → primera letra mayúscula.

## 10. Pruebas

### 10.1 Unitarias (`test/unit/`)

- `Pokemon.test.ts`: `fromSnapshot` con timestamps válidos e
  inválidos, `types` congelado.
- `PokemonName.test.ts`: normalización y reglas de validación
  (vacío, longitud, patrón).
- `PokemonError.test.ts`: códigos y `statusCode` opcional.
- `PokemonCreator.test.ts`: éxito en `create`, errores tipados.
- `ApiPokemonRepository.test.ts`: `POST` con `{ name }`, status
  `201/200/404/502`, mapeo de errores, payload inválido, `name`
  cruzado, error de red, trailing slash.
- `PokemonApiSchema.test.ts`: schema backend válido, payloads
  inválidos.
- `PokemonApiErrorMapper.test.ts`: `code` del backend, fallback por
  `statusCode`, `message` preservado.
- `PokemonPresenter.test.ts`: unidades y formato de fecha.
- `httpErrors.test.ts`: `combineSignals`, abort externo, timeout,
  `isAbortErrorLike`.
- `PokemonForm.test.tsx`, `StatusBanner.test.tsx`,
  `PokemonResult.test.tsx`: render y estados ARIA.

### 10.2 Integración (`test/integration/`)

- `HomePage.test.tsx`: ciclo completo del hook + render básico.
- `HomePageFlow.test.tsx`: input vacío, éxito, error, reset.

### 10.3 Dobles (`test/doubles/`)

- `InMemoryPokemonRepository.ts`: implementa `PokemonRepository` con
  un `Map` y flags `shouldFailFind` / `shouldFailCreate` para forzar
  errores en los tests.

### 10.4 Configuración

`vitest.config.ts`:

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test-setup.ts'],
  globals: true,
  css: false,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov', 'html'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: [
      'src/**/*.spec.{ts,tsx}',
      'src/main.tsx',
      'src/app/**',
      'src/test-setup.ts',
      'src/**/*.d.ts',
      'src/Contexts/Pokemon/ui/theme/**',
    ],
    thresholds: {
      lines: 85,
      statements: 85,
      functions: 85,
      branches: 80,
    },
  },
}
```

Exclusiones (ver ADR `0006`):

- `src/app/**`: composition root y `App` (bootstrap).
- `src/test-setup.ts`: registro de matchers.
- `src/Contexts/Pokemon/ui/theme/**`: SVG y tokens visuales.

## 11. Scripts (`apps/frontend/package.json`)

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host --port 5173",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
  },
}
```

## 12. Dockerfile y Nginx

Multi-stage (`apps/frontend/Dockerfile`):

1. **build**: `node:24-alpine` + `corepack enable` + `pnpm install
--frozen-lockfile --filter @pokemon-amaris/frontend...` +
   `pnpm --filter @pokemon-amaris/frontend build`. Vite bakea
   `VITE_API_BASE_URL=/api` en el bundle.
2. **runtime**: `nginx:alpine` sirviendo `dist/`. Healthcheck contra
   `/healthz`. `HEALTHCHECK` configurado con `wget -qO-
http://localhost/healthz`.

`apps/frontend/nginx.conf`:

- `upstream backend { server backend:3000; }`.
- `location /api/ { proxy_pass http://backend/; ... }`: reescribe
  cualquier `/api/*` → `http://backend:3000/*` (ver ADR `0004`).
- `location = /healthz { return 200 "ok\n"; }`: endpoint de
  healthcheck del contenedor.
- `location / { try_files $uri $uri/ /index.html; }`: SPA fallback.

> El cliente siempre llama a `/api/...`; el proxy (Vite en dev, Nginx
> en prod) elimina el prefijo.

## 13. Criterios de aceptación

- [ ] `pnpm dev` levanta Vite con proxy de `/api` a backend.
- [ ] Formulario acepta y normaliza `pikachu` / `Pikachu `.
- [ ] El cliente solo envía `POST /api/pokemon`. No hay `GET`
      previo; los duplicados los resuelve el backend con `P2002`
      recovery.
- [ ] Estados `idle`, `loading`, `success`, `error` correctamente
      diferenciados en el hook.
- [ ] `success` valida el contrato backend con `types: string[]` y
      `createdAt` requerido.
- [ ] `createdAt` se exige y se renderiza formateado en `es-PE`.
- [ ] Mensajes de error humanos se aplican cuando el body no cumple
      el schema de error del backend.
- [ ] Temática Pokémon sencilla aplicada (paleta, pokébola, tarjeta
      ficha).
- [ ] Diseño responsive y accesible (labels, roles, foco visible).
- [ ] Cobertura ≥ 85% global en frontend con exclusiones declaradas.
- [ ] Build de producción con `nginx` funcional en Docker y
      healthcheck `/healthz` verde.

## 14. Entregables

- `apps/frontend` operativo.
- Dockerfile con `nginx` y proxy `/api/*` → backend.
- Suite de tests con cobertura.
- Composition root manual y doble en memoria para tests.
