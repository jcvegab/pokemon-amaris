# PLAN — FRONTEND

## 1. Objetivo

Construir la aplicación en React 19 con Vite y Tailwind 4 que consume `POST /pokemon` del backend, gestiona estados de carga, éxito y error, y refleja los mensajes del servicio de forma comprensible.

## 2. Decisiones técnicas

| Aspecto            | Decisión                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Framework          | React 19                                                                                                                       |
| Build tool         | Vite 5                                                                                                                         |
| Lenguaje           | TypeScript 6.x (extiende `tsconfig.base.json`)                                                                                 |
| Estilos            | Tailwind CSS 4 (`@tailwindcss/vite`)                                                                                           |
| Cliente HTTP       | `fetch` nativo con `AbortController`                                                                                           |
| Formularios        | Un único input que envía `{ name }` (API también acepta `{ pokemon }`)                                                         |
| Estado servidor    | Local (sin TanStack Query; suficiente para el alcance)                                                                         |
| Router             | No requerido (SPA de una vista)                                                                                                |
| Tests              | Vitest + Testing Library + jsdom                                                                                               |
| Cobertura objetivo | > 85%                                                                                                                          |
| Accesibilidad      | Roles ARIA y foco visible                                                                                                      |
| Temática           | Estética Pokémon sencilla (paleta rojo/blanco/negro/amarillo, contenedor Pokédex, pokébola como detalle, tarjeta estilo ficha) |

## 3. Layout de `apps/frontend`

```
apps/frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── env.ts
│   ├── api/
│   │   ├── client.ts
│   │   └── create-pokemon.ts
│   ├── components/
│   │   ├── PokemonForm.tsx
│   │   ├── PokemonForm.test.tsx
│   │   ├── PokemonResult.tsx
│   │   ├── PokemonResult.test.tsx
│   │   ├── StatusBanner.tsx
│   │   └── StatusBanner.test.tsx
│   ├── hooks/
│   │   ├── useCreatePokemon.ts
│   │   └── useCreatePokemon.test.ts
│   ├── pages/
│   │   └── HomePage.tsx
│   ├── lib/
│   │   ├── format.ts
│   │   └── format.test.ts
│   └── types/
│       └── pokemon.ts
├── .env.example
├── index.html
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── package.json
└── README.md
```

## 4. Variables de entorno

`apps/frontend/.env.example`:

```env
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT_MS=8000
```

`src/env.ts` valida con `zod` y exporta un objeto tipado.

> **Convención `/api`:** el frontend siempre llama a `${VITE_API_BASE_URL}/pokemon`. En desarrollo, el dev server de Vite hace proxy de `/api` a `http://localhost:3000`. En Docker, Nginx hace proxy de `/api` a `http://backend:3000`. Esto evita CORS y mantiene el código del cliente idéntico entre entornos.

## 5. UI

### 5.1 Estructura

- Encabezado con título "Pokédex Amaris" y un detalle visual de pokébola.
- `<PokemonForm />`: un único input con etiqueta visible "Nombre del Pokémon", botón "Buscar y guardar", estados disabled durante la carga.
- `<StatusBanner />`: muestra carga, error o éxito; desaparece al cambiar de estado.
- `<PokemonResult />`: tarjeta con `id`, `name`, `height`, `weight`, `types` y la fecha `createdAt`.
- Pie con enlace al repositorio privado.

> **Input único:** la UI expone un solo campo "Nombre del Pokémon" que se envía como `{ name }`. El backend también acepta `{ pokemon }` para compatibilidad, pero la UI no lo usa.

### 5.2 Estados posibles

| Estado    | Visual                                                          |
| --------- | --------------------------------------------------------------- |
| `idle`    | Botón habilitado, sin banner                                    |
| `loading` | Botón con spinner, input deshabilitado, banner "Consultando..." |
| `success` | Banner verde con "Pokémon guardado", `<PokemonResult />`        |
| `error`   | Banner rojo con mensaje humano, sin resultado                   |

### 5.3 Mensajes de error humanos

| Código HTTP       | Mensaje                                              |
| ----------------- | ---------------------------------------------------- |
| 400               | "Revisa el nombre del Pokémon."                      |
| 404               | "No encontramos ese Pokémon. Verifica la escritura." |
| 502               | "No pudimos consultar la PokéAPI. Intenta de nuevo." |
| 503               | "El servicio no está disponible. Intenta más tarde." |
| Network / timeout | "Sin conexión. Revisa tu red."                       |
| Otro              | "Ocurrió un error inesperado."                       |

### 5.4 Temática visual

- **Paleta:** rojo (`#dc2626`), blanco, negro, amarillo (`#facc15`). Gris claro para fondos neutros.
- **Contenedor principal** inspirado en una Pokédex: bordes redondeados, sombra marcada, cabecera roja con título blanco.
- **Pokébola** dibujada en SVG local (sin recursos externos) como detalle decorativo o como spinner de carga.
- **Tarjeta de resultado** estilo ficha Pokémon: nombre grande, ID en formato `#025`, tipos como "etiquetas" con color por tipo.
- **Tipografía:** una sans-serif del sistema; el título "Pokédex Amaris" puede usar una tipografía display (ej. `Bangers` desde Google Fonts) sin penalizar el bundle.
- **Animaciones:** mínimas; el spinner de carga es la única animación visible.
- **Modo oscuro:** opcional mediante `prefers-color-scheme`; si se implementa, usar la misma paleta pero con fondo oscuro.
- **Responsive:** `max-w-md mx-auto`; padding generoso; foco visible con `ring-2` amarillo.
- **Sin imágenes externas:** todo el arte es SVG inline o CSS.

## 6. Hook `useCreatePokemon`

```ts
type Status = 'idle' | 'loading' | 'success' | 'error';
type State = { status: Status; data?: PokemonResponse; error?: string };

interface CreatePokemonInput {
  name?: string;
  pokemon?: string;
}
```

Responsabilidades:

- Validar que llegue exactamente uno de los dos campos.
- Llamar a `createPokemon` con `AbortController`.
- Mapear respuesta a `PokemonResponse` o a `Error` con mensaje humano.
- Exponer `submit(input)` y `reset()`.

## 7. Cliente API (`src/api/create-pokemon.ts`)

```ts
const base = import.meta.env.VITE_API_BASE_URL;
const timeout = import.meta.env.VITE_API_TIMEOUT_MS;

export async function createPokemon(input, signal): Promise<PokemonResponse> {
  const res = await fetch(`${base}/pokemon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });
  if (!res.ok) throw await mapError(res);
  return res.json();
}
```

`mapError` traduce el JSON `{ statusCode, code, message }` del backend a un `Error` con `code` y `humanMessage` (mensaje humano según la tabla 5.3). El `code` se conserva para logs.

## 8. Tipos

```ts
export interface PokemonResponse {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  createdAt: string;
}
```

## 9. Estilos

- Tailwind 4 vía `@tailwindcss/vite`.
- Tema oscuro/claro siguiendo `prefers-color-scheme` (opcional).
- Diseño responsive: `max-w-md mx-auto`, padding generoso, foco visible con `ring-2`.
- Paleta y componentes definidos en `src/theme/`: `colors.ts`, `pokeball.tsx` (SVG), `pokemon-badge.tsx` (chip de tipo).
- Tipografías y tokens en `src/theme/tokens.ts`.

## 10. Pruebas

### 10.1 Unitarias

- `format.ts`: formateo de `height`/`weight` con unidades.
- `useCreatePokemon`: éxito (201), éxito (200 existente), error 400, error 404, error 502, error 503, abort, timeout, validación de payload.
- `mapError`: traducción correcta por código HTTP y por `code` del backend.

### 10.2 Componentes (Testing Library)

- `PokemonForm`: dispara `submit` con `{ name }`; deshabilita input y botón durante la carga; muestra spinner.
- `StatusBanner`: muestra mensajes por estado (`idle`, `loading`, `success`, `error`).
- `PokemonResult`: renderiza campos y formato `#025` para el ID.

### 10.3 Configuración

`vitest.config.ts` con `jsdom`, `@testing-library/jest-dom`, `coverage` con `v8`.

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test-setup.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx'],
  },
}
```

Umbral de cobertura: `lines ≥ 85`, `statements ≥ 85`, `functions ≥ 85`, `branches ≥ 80`.

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

## 12. Dockerfile

Multi-stage:

1. **build**: `node:24-alpine` + `pnpm install --frozen-lockfile` + `pnpm build`. Vite bakea `VITE_API_BASE_URL=/api` en el bundle.
2. **runtime**: `nginx:alpine` sirviendo `dist/`, con `nginx.conf` que:
   - Sirve `dist/` como estático.
   - Hace proxy de `/api` → `http://backend:3000` para evitar CORS.
   - Re-escribe `/api/pokemon` a `http://backend:3000/pokemon`.

> El cliente **siempre** llama a `/api/...`; el proxy (Vite en dev, Nginx en prod) elimina el prefijo.

## 13. Criterios de aceptación

- [ ] `pnpm dev` levanta Vite con proxy de `/api` a backend.
- [ ] Formulario acepta y normaliza `pikachu` / `Pikachu `.
- [ ] El cliente siempre envía `{ name }` a `/api/pokemon`.
- [ ] Estados `idle`, `loading`, `success`, `error` correctamente diferenciados.
- [ ] Mensajes de error comprensibles según el código HTTP.
- [ ] Temática Pokémon sencilla aplicada (paleta, pokébola, tarjeta ficha).
- [ ] Diseño responsive y accesible (labels, roles, foco visible).
- [ ] Cobertura > 85% global en frontend.
- [ ] Build de producción con `nginx` funcional en Docker.

## 14. Entregables

- `apps/frontend` operativo.
- Dockerfile con `nginx` y proxy a backend.
- Suite de tests con cobertura.
