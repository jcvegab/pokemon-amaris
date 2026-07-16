# EXECUTION — fases de construcción

## 1. Objetivo

Definir el plan de ejecución por fases, con separación clara de
responsabilidades entre agentes, para construir el monorepo
`pokemon-amaris` siguiendo los documentos `STRUCTURE.md`,
`BACKEND.md`, `FRONTEND.md`, `CI.md` y `DIAGRAM.md`.

## 2. Decisiones cerradas

| #   | Decisión                                                                                                                                                     | Documento de origen          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| 1   | TypeScript: 5.7.x (workspace root, usado por `apps/backend` y tooling) + 6.x (solo `apps/frontend`)                                                          | STRUCTURE, BACKEND, FRONTEND |
| 2   | `POST /pokemon` responde `201 Created` cuando crea y `200 OK` cuando el Pokémon ya existe                                                                    | BACKEND, DIAGRAM             |
| 3   | Frontend consume el backend a través de `/api/*` (Vite proxy en dev, Nginx en Docker)                                                                        | FRONTEND, CI                 |
| 4   | UI expone un único input que envía `{ name }` (backend también acepta `{ pokemon }`)                                                                         | FRONTEND                     |
| 5   | PostgreSQL **no** se usa en CI: Prisma y repositorios se mockean en los tests                                                                                | BACKEND, CI                  |
| 6   | CI ejecuta backend y frontend completos en cada PR (sin detección de cambios)                                                                                | CI                           |
| 7   | Concurrencia: `INSERT pokemons` + captura de `P2002` + relectura por `name` (ver ADR `0011`)                                                                 | BACKEND                      |
| 8   | Temática visual: Pokédex sencilla con paleta rojo/blanco/negro/amarillo, pokébola SVG y tarjeta estilo ficha                                                 | FRONTEND                     |
| 9   | `PORT` es la variable interna del backend; los puertos host se definen en `docker-compose.yml`                                                               | STRUCTURE, CI                |
| 10  | `db-init` (servicio Compose) ejecuta `prisma db push` antes de levantar el backend                                                                           | CI                           |
| 11  | Esquema uniforme de error: `{ statusCode, code, message, timestamp, path }` con `message` siempre `string`                                                   | BACKEND                      |
| 12  | Diagrama de arquitectura: `NestJS → Prisma → PostgreSQL` (sin conexión SQL directa)                                                                          | DIAGRAM                      |
| 13  | Frontend solo envía `POST /pokemon`. No hace `GET` previo (ADR `0010` se reduce a contrato backend-only, abort y mensajes; ADR `0011` documenta el as-built) | FRONTEND, DIAGRAM, ADR 0010  |
| 14  | Frontend adopta arquitectura contextual por bounded context con composition root manual                                                                      | FRONTEND, ADR 0009           |
| 15  | Nginx proxifica `/api/*` (no solo `/api/pokemon`); frontend expone `/healthz`                                                                                | FRONTEND, ADR 0004           |

## 3. Ruta crítica

```text
Fase 0 → Fase 1 → Fase 2A/2B (paralelas) → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7
                          ↘ Fase 2C (documentación paralela, cierre en Fase 6) ↗
```

## 4. Layout y propiedad por agente

```text
/
├── package.json                       # Foundation
├── pnpm-workspace.yaml                # Foundation
├── tsconfig.base.json                 # Foundation
├── eslint.config.mjs                  # Foundation
├── .prettierrc.json                   # Foundation
├── .editorconfig                      # Foundation
├── .gitignore                         # Foundation
├── .npmrc                             # Foundation
├── .nvmrc                             # Foundation
├── .env.example                       # Foundation
├── .husky/                            # Foundation
├── docker-compose.yml                 # Infra
├── README.md                          # Docs
├── apps/
│   ├── backend/                       # Backend
│   └── frontend/                      # Frontend
├── docs/
│   ├── STRUCTURE.md                   # Foundation
│   ├── BACKEND.md                     # Backend
│   ├── FRONTEND.md                    # Frontend
│   ├── CI.md                          # CI/CD
│   ├── DIAGRAM.md                     # Docs
│   ├── EXECUTION.md                   # Docs (este archivo)
│   ├── adr/                           # Docs
│   └── diagrams/                      # Docs
└── .github/                           # CI/CD
```

**Regla anti-conflicto:** un único agente propietario por ruta.
Ningún agente edita fuera de su área sin coordinación con el
integrador.

## 5. Fases

### Fase 0 — Contratos y Decisiones

**Agente:** Arquitectura
**Salidas:**

- Contrato HTTP definitivo: `POST /pokemon` y `GET /health`, esquema
  de error. El frontend solo envía `POST` y deja al backend
  resolver duplicados con `P2002` recovery (ver ADR `0011`).
- Versiones exactas confirmadas (TS 5.7 backend, TS 6 frontend,
  Node 24, NestJS 11, Prisma 5, Vite 5, React 19, Tailwind 4, pnpm 10).
- Variables de entorno: `PORT`, `DATABASE_URL`, `POKEAPI_BASE_URL`,
  `POKEAPI_TIMEOUT_MS`, `VITE_API_BASE_URL=/api`,
  `VITE_API_TIMEOUT_MS`.
- Lista de ADRs iniciales.
- Matriz de criterios de aceptación por fase.

**Criterio de salida:** el resto de agentes puede leer un único
bloque de contratos y no necesita reinterpretar los documentos.

### Fase 1 — Estructura del Monorepo

**Agente:** Foundation
**Archivos:** raíz del monorepo.
**Salidas:**

- `package.json` raíz con scripts: `dev`, `build`, `lint`, `test`,
  `test:cov`, `format`, `format:check`, `prepare`.
- `pnpm-workspace.yaml` con `apps/*`.
- `tsconfig.base.json` con `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- `eslint.config.mjs` flat config compartida.
- `.prettierrc.json` con formato consistente.
- `.editorconfig` LF/UTF-8.
- `.gitignore` completo.
- `.npmrc` con `strict-peer-dependencies=true`.
- `.nvmrc` con `24`.
- `.env.example` con variables comunes (sin secretos).
- `.husky/pre-commit` y `lint-staged` activos.
- `apps/backend/` y `apps/frontend/` con `package.json` mínimos.
- `docs/adr/`, `docs/diagrams/` con placeholders.

**Criterio de salida:**

```bash
pnpm install
pnpm lint    # pasa en vacío
pnpm test    # pasa en vacío
pnpm build   # pasa en vacío
```

### Fase 2A — Backend

**Agente:** Backend
**Archivos:** `apps/backend/**`.
**Ejecución:** paralela con 2B y 2C.

**Orden interno (as-built):**

1. Bootstrap NestJS 11 en CommonJS, `@nestjs/config` con
   validación `zod` (`env.schema.ts`).
2. Prisma 5: `schema.prisma`, `PrismaService`, `PrismaModule`
   bajo `Contexts/Shared/infrastructure/persistence/prisma/`.
3. Dominio (`Contexts/Pokemon/domain`): entidad `Pokemon`,
   value objects (`PokemonId`, `PokemonName`, `PokemonTypes`),
   puerto `PokemonRepository`.
4. Errores: `PokemonApplicationErrors.ts` (no `DomainError`); el
   filtro `HttpErrorFilter` vive en
   `Contexts/Shared/infrastructure/http/`.
5. Aplicación (`Contexts/Pokemon/application`): caso de uso
   `PokemonCreator` con flujo
   `findByName → searchInCatalog → save`; puerto `PokemonCatalog`
   y errores de aplicación.
6. Infraestructura:
   `Contexts/Pokemon/infrastructure/pokeapi/PokeApiHttpModule.ts`
   con `PokeApiPokemonCatalog` (adaptador) + `PokeApiPokemonSchema`
   - `PokeApiPokemonMapper`;
     `Contexts/Pokemon/infrastructure/persistence/prisma/PrismaPokemonRepository.ts`
     con `save()` que captura `P2002` y relee por `name`.
7. `dependency-injection/PokemonModule.ts` con tokens `Symbol`
   (`POKEMON_REPOSITORY`, `POKEMON_CATALOG`, `POKEMON_CREATOR`)
   y `useFactory` para instanciar `PokemonCreator`.
8. `Contexts/Pokemon/infrastructure/http/PokemonPostController.ts`
   con `POST /pokemon` y flag `created` que mapea a `201` o `200`.
9. `GET /health` con `TerminusModule` +
   `DatabaseHealthIndicator` mockeable
   (en `src/shared/health/`, fuera de `Contexts/`).
10. Swagger en `/docs` y `/docs-json`.
11. Logger `nestjs-pino` con `requestId` y `pino-pretty` fuera
    de producción.
12. Dockerfile multi-stage; el stage runtime ejecuta solo
    `node dist/main.js`. El servicio `db-init` inicializa Prisma en
    Compose.
13. Tests unitarios y de integración (Prisma y PokeAPI
    mockeados; los tokens `POKEMON_REPOSITORY` y
    `POKEMON_CATALOG` se sustituyen en tests de integración).

> La fase 2A solo expone `POST /pokemon` y `GET /health`. Ver
> ADR `0011`. El frontend solo envía `POST`; no consulta el
> estado del Pokémon antes de enviar.

**Casos obligatorios:**

- `{ name }` válido y DB vacía → 201.
- `{ name }` válido y registro existente → 200.
- `{ pokemon }` válido → 201.
- Body vacío → 400.
- Ambos campos → 400.
- Campo extra → 400 (whitelist).
- `name` con 51 caracteres → 400.
- Normalización: trim + lowercase.
- PokeAPI 404 → 404.
- PokeAPI timeout/5xx → 502.
- PokeAPI payload inválido → 502.
- DB caída en lectura → 503.
- DB caída en escritura → 503.
- Conflicto `P2002` en escritura → 200 con fila existente.
- `GET /health` con DB up → 200.
- `GET /health` con DB down → 503.

**Criterio de salida:**

```bash
pnpm --filter @pokemon-amaris/backend lint
pnpm --filter @pokemon-amaris/backend test:cov
pnpm --filter @pokemon-amaris/backend build
```

Cobertura ≥ 85% (lines, statements, functions), branches ≥ 80%.

### Fase 2B — Frontend

**Agente:** Frontend
**Archivos:** `apps/frontend/**`.
**Ejecución:** paralela con 2A y 2C. Backend se simula con mocks.

**Orden interno (as-built):**

1. Bootstrap Vite 5 + React 19 con TypeScript 6.
2. Tailwind 4 vía `@tailwindcss/vite`; tokens y `@layer components`
   en `src/index.css`.
3. `Contexts/Shared/infrastructure/config/env.ts` con validación
   `zod` (`VITE_API_BASE_URL=/api`, `VITE_API_TIMEOUT_MS`).
4. Capas del bounded context `Pokemon`:
   - `domain/`: `PokemonName`, `Pokemon`, `PokemonError`.
   - `application/ports/PokemonRepository.ts` con `create(name)`.
   - `application/create/PokemonCreator.ts` que normaliza y
     delega en `create` (sin `findByName` previo; el backend
     maneja duplicados con `P2002`).
   - `infrastructure/api/`: `PokemonApiSchema` (zod),
     `PokemonApiMapper`, `PokemonApiErrorMapper`,
     `ApiPokemonRepository`.
5. `Contexts/Shared/infrastructure/http/httpErrors.ts` con
   `HttpError`, `NetworkError`, `RequestAbortedError`,
   `combineSignals`.
6. `src/app/composition-root.ts` que instancia
   `ApiPokemonRepository` + `PokemonCreator`.
7. `src/app/App.tsx` que pasa el caso de uso a `HomePage`.
8. UI: `PokemonForm`, `StatusBanner`, `PokemonResult`,
   `useCreatePokemon`, `PokemonPresenter`, `theme/`
   (`Pokeball`, `PokemonBadge`, `tokens`).
9. Vite proxy `/api/*` → `http://localhost:3000`.
10. Temática Pokémon: paleta, pokébola SVG, tarjeta ficha, spinner.
11. Accesibilidad: roles ARIA, foco visible, responsive.
12. Tests en `test/unit/`, `test/integration/` y
    `test/doubles/InMemoryPokemonRepository`.
13. Vitest + Testing Library + jsdom. Umbral de cobertura 85% con
    exclusiones declaradas.
14. Dockerfile multi-stage con Nginx y proxy `/api/*` →
    `http://backend:3000`, healthcheck `/healthz`.

**Casos obligatorios:**

- Envío con `{ name }` normalizado (`pikachu`, `Pikachu `,
  `  PIKACHU  `).
- Solo `POST /pokemon`; sin `GET` previo. Duplicados los resuelve
  el backend con `P2002` recovery.
- Estados `idle`, `loading`, `success`, `error`.
- Error 400, 404, 502, 503, timeout, red.
- Preservación del `message` del backend cuando el body cumple el
  schema de error; fallback humano cuando no.
- Mobile y desktop.
- Foco visible y roles ARIA.
- Spinner temático durante carga.

**Criterio de salida:**

```bash
pnpm --filter @pokemon-amaris/frontend lint
pnpm --filter @pokemon-amaris/frontend test:cov
pnpm --filter @pokemon-amaris/frontend build
```

### Fase 2C — Documentación Inicial

**Agente:** Docs
**Archivos:** `docs/adr/0001..0008.md`, `docs/diagrams/*.mmd`.
**Ejecución:** paralela; cierre en Fase 6.

**Salidas:**

- `0001-monorepo-pnpm.md`.
- `0002-postgres-prisma.md`.
- `0003-arquitectura-hexagonal.md`.
- `0004-docker-compose.md`.
- `0005-github-actions.md`.
- `0006-cobertura-85.md`.
- `0007-ai-usage.md`.
- `0008-repository-hygiene.md`.
- `docs/diagrams/sequence.mmd` y `docs/diagrams/architecture.mmd`
  (placeholders, contenido versionado dentro de `DIAGRAM.md`).

### Fase 3 — Integración y Docker

**Agente:** Infra
**Archivos:** `docker-compose.yml`,
`apps/backend/Dockerfile`, `apps/frontend/Dockerfile`,
`apps/frontend/nginx.conf`.
**Dependencia:** Fases 2A y 2B.

**Servicios:**

- `db` (Postgres 17) con healthcheck.
- `db-init` que ejecuta `prisma db push`.
- `backend` con `healthcheck` contra `/health` y
  `depends_on: db-init completed`.
- `frontend` con Nginx y `depends_on: backend healthy`.

**Proxy:** Nginx proxifica `/api/*` → `http://backend:3000/*`
(genérico, ver ADR `0004`). `frontend` también expone `/healthz`
para healthcheck de Docker.

**Criterio de salida:**

```bash
docker compose up --build
curl http://localhost:3000/health
curl -X POST http://localhost:3000/pokemon -H 'Content-Type: application/json' -d '{"name":"pikachu"}'
curl -X POST http://localhost:8080/api/pokemon -H 'Content-Type: application/json' -d '{"name":"charmander"}'
```

Verificación de persistencia tras reinicio del backend.

### Fase 4 — Calidad

**Agentes paralelos:** QA Backend, QA Frontend, QA Integración.
**Reportan hallazgos al agente propietario. No editan archivos
ajenos.**

**Objetivos:**

- Cobertura backend y frontend ≥ 85%.
- Branches ≥ 80%.
- Lint sin warnings.
- Sin secretos en diff.
- Logs sin PII.
- Contrato frontend/backend consistente.
- Casos del `DEFINITION.md` cubiertos.
- Smoke test de `docker compose` en limpio.

### Fase 5 — CI y Gobierno

**Agente:** CI/CD
**Archivos:** `.github/**`.

**Salidas:**

- `workflows/ci.yml` con jobs `backend`, `frontend`,
  `backend-openapi`, `summary`.
- `workflows/docker.yml` con build de imágenes por aplicación.
- `workflows/codeql.yml` opcional.
- `dependabot.yml` con `npm`, `github-actions`, `docker`.
- `pull_request_template.md`.
- `ISSUE_TEMPLATE/bug_report.md` y `feature_request.md`.
- `CODEOWNERS`.
- Documentación de branch protection.

**Job `backend-openapi`:**

- Reusa `dist/` de `backend`.
- Levanta servicio Postgres efímero.
- `pnpm prisma:push` y luego `node dist/main.js` en background.
- `wait-on http://localhost:3000/docs-json`.
- `curl -fsS http://localhost:3000/docs-json -o openapi.json`.
- Sube `openapi.json` como artefacto.

**Validación:** checks `ci/backend`, `ci/frontend`, `ci/summary`
quedan verdes.

### Fase 6 — Documentación Final

**Agente:** Docs
**Archivos:** `README.md`, `docs/DIAGRAM.md`,
`docs/adr/**` (refinamiento), `docs/diagrams/**`.

**Salidas:**

- README con ejecución local y Docker, ejemplos, tabla de errores,
  decisiones.
- `docs/DIAGRAM.md` con Mermaid embebido (no rutas externas).
- Diagramas: secuencia y arquitectura.
- ADRs finales (incluyendo `0009` arquitectura contextual
  frontend y `0010` flujo HTTP frontend).
- Registro de uso de IA.

### Fase 7 — Release

**Agente:** Release
**Dependencia:** todas las fases anteriores.

**Checklist:**

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test:cov
pnpm build
docker compose up --build
```

**Validación manual:**

- Crear Pokémon nuevo (201) y verificar persistencia.
- Repetir el mismo nombre y verificar 200 con misma fecha.
- Probar `name` y `pokemon` desde `curl`.
- Body inválido → 400.
- Apagar `db` en Compose y verificar `GET /health` → 503.
- Verificar UI en mobile y desktop.
- Verificar Swagger en `/docs`.
- Verificar diagramas renderizados.
- Leer README desde instalación limpia.

## 6. Asignación de Agentes

| Agente         | Propiedad                                      | Inicio | Fin | Paralelizable    |
| -------------- | ---------------------------------------------- | ------ | --- | ---------------- |
| Arquitectura   | contratos, decisiones                          | 0      | 0   | No               |
| Foundation     | raíz del monorepo                              | 1      | 1   | No               |
| Backend        | `apps/backend/**`                              | 2      | 2A  | Sí (con 2B y 2C) |
| Frontend       | `apps/frontend/**`                             | 2      | 2B  | Sí (con 2A y 2C) |
| Docs           | `docs/**`, `README.md`                         | 2      | 6   | Sí (con 2A y 2B) |
| Infra          | `docker-compose.yml`, Dockerfile, `nginx.conf` | 3      | 3   | No               |
| QA Backend     | solo inspección                                | 4      | 4   | Sí               |
| QA Frontend    | solo inspección                                | 4      | 4   | Sí               |
| QA Integración | solo inspección                                | 4      | 4   | Sí               |
| CI/CD          | `.github/**`                                   | 5      | 5   | No               |
| Release        | verificación global                            | 7      | 7   | No               |

## 7. Prompts por Agente

### Arquitectura (Fase 0)

```text
Eres el agente de arquitectura. Tu única entrega son contratos y decisiones:
1. POST /pokemon: 201 nuevo, 200 existente. Schema: { id, name, height, weight, types, createdAt }.
2. GET /health: 200 si DB up, 503 si DB down.
3. Error: { statusCode, code, message, timestamp, path }, message siempre string.
4. Variables: PORT (backend), DATABASE_URL, POKEAPI_BASE_URL, POKEAPI_TIMEOUT_MS,
   VITE_API_BASE_URL=/api, VITE_API_TIMEOUT_MS.
5. Versiones: TS 5.7 (backend y tooling), TS 6 (solo frontend), Node 24, NestJS 11, Prisma 5, Vite 5,
   React 19, Tailwind 4, pnpm 10.
6. Concurrencia: INSERT pokemons + captura de P2002 + relectura por name.
7. No escribir código. Solo documentos de contrato y ADR inicial.
```

### Foundation (Fase 1)

```text
Eres el agente foundation. Crea la base del monorepo:
- pnpm 10 workspaces, TS 5.7 estricto (root), ESLint flat, Prettier, Husky, lint-staged.
- tsconfig.base.json con strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes.
- .env.example con PORT, DATABASE_URL, POKEAPI_BASE_URL, POKEAPI_TIMEOUT_MS,
  VITE_API_BASE_URL=/api, VITE_API_TIMEOUT_MS.
- Apps vacías con package.json mínimo y scripts que delegan al workspace.
- Validar: pnpm install, pnpm lint, pnpm test, pnpm build.
No instalar NestJS ni React todavía.
```

### Backend (Fase 2A)

```text
Eres el agente backend. Trabajas solo en apps/backend/**.
Sigue BACKEND.md, los contratos de Fase 0 y el ADR 0011:
- NestJS 11 en CommonJS; TypeScript efectivo 5.7.x (workspace root).
- Prisma 5.22. Layout por bounded contexts:
  Contexts/Pokemon/{domain,application,infrastructure} y
  Contexts/Shared/infrastructure. src/health/ y src/shared/health/
  se mantienen fuera de Contexts/Shared.
- POST /pokemon: 201 nuevo, 200 existente. Persistencia con
  PrismaPokemonRepository.save(): INSERT pokemons + captura de
  P2002 + SELECT por name.
- POST /pokemon acepta { name } o { pokemon }, normalización trim+lowercase.
- GET /health con Terminus + DatabaseHealthIndicator (Prisma $queryRaw).
- Errores de aplicación en PokemonApplicationErrors.ts;
  HttpErrorFilter en Contexts/Shared/infrastructure/http.
- Logger nestjs-pino con requestId y pino-pretty fuera de producción.
- Swagger en /docs y /docs-json.
- Tokens DI: POKEMON_REPOSITORY, POKEMON_CATALOG, POKEMON_CREATOR
  (Symbol, exportados desde PokemonTokens.ts).
- Tests: Prisma y PokeAPI mockeados; integración sustituye los
  tokens por dobles. Sin DB real en CI. Config en jest.config.cjs;
  sin test:e2e. Convención *.test.ts.
- Cobertura ≥ 85% lines/statements/functions, branches ≥ 80%.
- Dockerfile multi-stage con node:24-alpine; el CMD del runtime
  ejecuta solo node dist/main.js. db-init ejecuta prisma db push en
  Compose.
```

### Frontend (Fase 2B)

```text
Eres el agente frontend. Trabajas solo en apps/frontend/**.
Sigue FRONTEND.md y los contratos de Fase 0:
- Vite 5, React 19, TS 6 (frontend), Tailwind 4.
- VITE_API_BASE_URL=/api. Vite proxy en dev, Nginx en prod.
- Un único input que envía { name }.
- Bounded context Pokemon con capas domain/application/infrastructure/ui.
- Composition root manual en src/app.
- Solo `POST /pokemon`; sin `GET` previo. Duplicados los resuelve
  el backend con `P2002` recovery.
- useCreatePokemon con state discriminado y AbortController por request.
- Presenter convierte Pokemon → PokemonViewModel (unidades, fecha es-PE).
- Mensajes de error humanos cuando el body no cumple el schema; en caso
  contrario, preservar message del backend.
- Tests: test/unit, test/integration, test/doubles/InMemoryPokemonRepository.
- Vitest + Testing Library + jsdom. Cobertura ≥ 85% con exclusiones
  declaradas (src/app, test-setup, theme).
- Dockerfile multi-stage con nginx:alpine y proxy /api/* → http://backend:3000.
  Healthcheck contra /healthz.
```

### Infra (Fase 3)

```text
Eres el agente infra. Tu salida es docker-compose.yml y la configuración Nginx.
Servicios:
- db: postgres:17-alpine con healthcheck pg_isready.
- db-init: node:24-alpine que ejecuta pnpm install --frozen-lockfile --filter @pokemon-amaris/backend...
  y luego pnpm --filter @pokemon-amaris/backend prisma:push. Restart: no.
- backend: build desde apps/backend/Dockerfile. healthcheck contra /health.
  depends_on: db-init service_completed_successfully.
- frontend: build desde apps/frontend/Dockerfile. depends_on: backend healthy.
  Puerto host 8080 → 80 contenedor. Healthcheck contra /healthz.
Puertos host: backend 3000, frontend 8080.
Nginx del frontend proxifica /api/* → http://backend:3000/* y expone /healthz.
```

### CI/CD (Fase 5)

```text
Eres el agente CI/CD. Trabajas en .github/**.
Pipeline ci.yml con jobs:
- backend: install, lint, test:cov, build. Sube coverage.
- frontend: install, lint, test:cov, build. Sube coverage y dist.
- backend-openapi: usa dist del job backend, levanta Postgres efímero, hace prisma:push,
  arranca node dist/main.js, wait-on /docs-json, guarda openapi.json como artefacto.
- summary: combina cobertura y comenta el PR.
Sin detección de cambios. Siempre ejecuta todo.
Workflow docker.yml: buildx para backend y frontend. Etiqueta gitsha, branch, latest.
Dependabot, PR template, issue templates, CODEOWNERS, codeql opcional.
```

### Docs (Fase 6)

```text
Eres el agente docs. Cierras documentación.
- README.md con: descripción, arquitectura, stack, ejecución local, ejecución Docker,
  endpoint con ejemplo y tabla de errores, pruebas, decisiones (links a ADRs),
  uso de IA, diagrama.
- docs/DIAGRAM.md con Mermaid embebido (no rutas externas).
- docs/diagrams/*.mmd como fuente cuando se generen aparte.
- ADRs 0001..0010 refinados. ADRs 0009 (arquitectura contextual frontend)
  y 0010 (flujo HTTP frontend) son obligatorios para reflejar lo construido.
```

### QA (Fase 4)

```text
Eres QA. No editas. Reportas hallazgos.
- QA Backend: cobertura, casos obligatorios, formato de errores, arquitectura.
- QA Frontend: estados, accesibilidad, responsive, cobertura, temática.
  Verifica la conformidad con la respuesta pública del backend
  (`types: string[]`, `createdAt` requerido; ADR 0010).
- QA Integración: docker compose up, persistencia tras reinicio, proxy /api, health.
Cada hallazgo indica: severidad, archivo:línea, descripción, sugerencia de fix.
```

## 8. Orden de Integración

```text
1. Foundation
2. Backend + Frontend + Docs (en paralelo)
3. Infra
4. QA
5. CI/CD
6. Docs finales
7. Release
```

## 9. Reglas Operativas

- Una rama por agente: `feat/phase-N-<agente>`.
- Commits en Conventional Commits.
- Integrador único controla merges a `main`.
- Cualquier fix vuelve al agente propietario del archivo.
- Cambios raíz solo los hace Foundation o Integrador.
- Contrato congelado en Fase 0; cambios posteriores requieren ADR.
- No editar fuera del área asignada.
- Antes de pedir review, ejecutar `pnpm lint`, `pnpm test`,
  `pnpm build` en la app propia.

### 9.1 Política de commits por fase

| Fase | Commit obligatorio | Tipo sugerido                                    | Rama                                | Notas                                                                                            |
| ---- | ------------------ | ------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| 0    | No                 | `docs(adr):`                                     | `feat/phase-0-architecture`         | Cambios contractuales van en un único commit al cerrar la fase si los hubo.                      |
| 1    | Sí                 | `chore: initialize monorepo foundation`          | `feat/phase-1-foundation`           | Un commit tras validar `pnpm install/lint/test/build` en vacío.                                  |
| 2A   | Sí                 | `feat(backend): implement pokemon service`       | `feat/phase-2a-backend`             | Cerrar solo cuando se cumple el criterio de salida del backend.                                  |
| 2B   | Sí                 | `feat(frontend): build pokemon themed interface` | `feat/phase-2b-frontend`            | Cerrar solo cuando se cumple el criterio de salida del frontend.                                 |
| 2C   | Sí                 | `docs: add architecture decisions`               | `feat/phase-2c-docs`                | Cierre parcial; refinamientos van en Fase 6.                                                     |
| 3    | Sí                 | `chore(infra): add containerized stack`          | `feat/phase-3-infra`                | Commit tras `docker compose up --build` exitoso.                                                 |
| 4    | No                 | `docs(qa):` o `fix:`                             | mismas ramas de las fases auditadas | QA no commitea cambios; solo registra. Si un agente propietario corrige, se commitea en su rama. |
| 5    | Sí                 | `ci: add validation workflows`                   | `feat/phase-5-cicd`                 | Commit tras ver el pipeline verde.                                                               |
| 6    | Sí                 | `docs: finalize project documentation`           | `feat/phase-6-docs`                 | Cierra README, diagramas y ADRs finales.                                                         |
| 7    | No                 | `chore(release):`                                | `main` (tag)                        | Tag anotado `v0.1.0`. No hay commit nuevo en código.                                             |

**Reglas:**

- Cada commit se hace **solo** después de cumplir el criterio de
  salida de la fase.
- Fases paralelas (`2A`, `2B`, `2C`) producen commits independientes en
  sus respectivas ramas.
- QA no genera commits propios. Si un agente propietario aplica
  correcciones durante QA, se commitea en la rama del propietario.
- El integrador no mezcla fases en un mismo commit.
- Commits con cambios parciales o que rompan el criterio de salida no
  se aceptan.
- Conventional Commits estricto: tipo, scope opcional, descripción
  imperativa.
- Mensaje de commit incluye referencia a la fase cuando aporta
  trazabilidad, p. ej. `feat(backend): implement pokemon service
(phase 2a)`.

**Commits esperados (resumen):**

```text
chore: initialize monorepo foundation
feat(backend): implement pokemon service
feat(frontend): build pokemon themed interface
docs: add architecture decisions
chore(infra): add containerized stack
ci: add validation workflows
docs: finalize project documentation
```

## 10. Criterios de Aceptación del Plan

- [ ] Plan ejecutado en orden sin bloqueos no resueltos.
- [ ] Cada fase completa sus criterios de salida antes de la
      siguiente.
- [ ] Cada fase con commit obligatorio genera exactamente un commit
      de cierre en su rama.
- [ ] QA sin commit propio; correcciones commiteadas por el agente
      propietario.
- [ ] Release no introduce commit nuevo; se materializa como tag
      anotado.
- [ ] Cobertura backend y frontend ≥ 85%.
- [ ] `docker compose up --build` arranca los tres servicios sin
      intervención.
- [ ] `POST /pokemon` con `{name:"pikachu"}` retorna 201; repetido
      retorna 200.
- [ ] UI envía `{ name }` y muestra estados correctamente.
- [ ] CI corre en cada PR, publica cobertura y OpenAPI.
- [ ] `docs/DIAGRAM.md` renderiza en GitHub.
- [ ] README cubre ejecución local y Docker.

## 11. Entregables

- `docs/EXECUTION.md` (este archivo).
- `apps/backend` operativo.
- `apps/frontend` operativo.
- `docker-compose.yml` funcional.
- `.github/workflows/ci.yml` y `docker.yml`.
- README, diagramas y ADRs completos.
