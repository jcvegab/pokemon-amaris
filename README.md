# pokemon-amaris

Servicio NestJS + frontend React para crear y guardar Pokémon usando
datos de [PokeAPI](https://pokeapi.co/). El proyecto está organizado
como monorepo `pnpm` con backend, frontend, PostgreSQL y Docker Compose.

## Qué Incluye

- Backend NestJS 11 con `POST /pokemon`, `GET /health` y Swagger en `/docs`.
- Frontend React 19 con UI tipo Pokédex y proxy `/api/*` hacia backend.
- PostgreSQL 17 + Prisma 5.22, sin migraciones; se usa `prisma db push`.
- Tests unitarios/integración con cobertura global mayor a 85%.
- CI con GitHub Actions, artefactos de cobertura y OpenAPI.
- Documentación de arquitectura, ADRs y diagramas Mermaid.

## Arquitectura

El flujo principal es:

```text
Browser -> React -> /api/pokemon -> Nginx -> NestJS -> Prisma -> PostgreSQL
                                           -> PokeAPI
```

Puntos clave:

- Frontend solo envía `POST /api/pokemon` con `{ name }`.
- Nginx reescribe `/api/*` hacia `http://backend:3000/*` en Docker.
- Backend acepta `{ name }` o `{ pokemon }`.
- Backend consulta primero PostgreSQL por `name`; si no existe, consulta PokeAPI y persiste.
- Concurrencia: `INSERT` + captura de `P2002` + relectura por `name`.
- Error público uniforme: `{ statusCode, code, message, timestamp, path }`.

Ver diagramas completos en [`docs/DIAGRAM.md`](docs/DIAGRAM.md).

## Stack

| Área         | Tecnología                                   |
| ------------ | -------------------------------------------- |
| Monorepo     | pnpm 10 workspaces                           |
| Runtime      | Node 24                                      |
| Backend      | NestJS 11, TypeScript 5.7, CommonJS          |
| ORM / DB     | Prisma 5.22, PostgreSQL 17                   |
| Frontend     | React 19, Vite 5, TypeScript 6, Tailwind 4   |
| Tests        | Jest, Vitest, Testing Library                |
| Contenedores | Docker Compose, node:24-alpine, nginx:alpine |
| CI           | GitHub Actions, Dependabot, CodeQL opcional  |

## Prerrequisitos

- Node.js `>=24`
- pnpm `>=10`
- Docker
- Docker Compose v2

## Ejecución Con Docker

Desde la raíz:

```bash
docker compose up --build
```

Servicios:

| Servicio       | URL                               |
| -------------- | --------------------------------- |
| Frontend       | `http://localhost:8080`           |
| Backend        | `http://localhost:3000`           |
| Health backend | `http://localhost:3000/health`    |
| Swagger        | `http://localhost:3000/docs`      |
| OpenAPI JSON   | `http://localhost:3000/docs-json` |

Para limpiar todo y levantar desde cero:

```bash
docker compose down --volumes --rmi local --remove-orphans
docker compose up --build
```

## Ejecución Local

Instala dependencias:

```bash
pnpm install
```

Levanta solo PostgreSQL:

```bash
docker compose up -d db
```

Exporta variables o crea `.env` equivalente a `.env.example`. Para backend local, usa DB en `localhost`:

```bash
export DATABASE_URL="postgresql://pokemon:pokemon@localhost:5432/pokemon"
export POKEAPI_BASE_URL="https://pokeapi.co/api/v2"
export POKEAPI_TIMEOUT_MS="5000"
export PORT="3000"
```

Prepara Prisma:

```bash
pnpm --filter @pokemon-amaris/backend prisma:generate
pnpm --filter @pokemon-amaris/backend prisma:push
```

Levanta backend y frontend:

```bash
pnpm dev
```

En modo dev, Vite sirve el frontend en su puerto por defecto y proxifica `/api/*` a `http://localhost:3000`.

## API

### Crear Pokémon

```http
POST /pokemon
Content-Type: application/json
```

Body preferido:

```json
{ "name": "pikachu" }
```

Body también aceptado por backend:

```json
{ "pokemon": "pikachu" }
```

Respuesta `201 Created` si se crea:

```json
{
  "id": 25,
  "name": "pikachu",
  "height": 4,
  "weight": 60,
  "types": ["electric"],
  "createdAt": "2026-07-16T21:25:24.432Z"
}
```

Respuesta `200 OK` si ya existía. El body tiene el mismo contrato y conserva el `createdAt` persistido.

Ejemplo directo al backend:

```bash
curl -i -X POST http://localhost:3000/pokemon \
  -H 'Content-Type: application/json' \
  -d '{"name":"pikachu"}'
```

Ejemplo vía frontend/Nginx:

```bash
curl -i -X POST http://localhost:8080/api/pokemon \
  -H 'Content-Type: application/json' \
  -d '{"name":"charmander"}'
```

### Health

```bash
curl http://localhost:3000/health
```

Respuesta con DB disponible:

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" } }
}
```

## Errores

| HTTP | Code                   | Caso                                                    |
| ---- | ---------------------- | ------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`     | Body vacío, ambos campos, campo extra, formato inválido |
| 400  | `INVALID_POKEMON_NAME` | Nombre rechazado por dominio                            |
| 404  | `POKEMON_NOT_FOUND`    | PokeAPI no encuentra el Pokémon                         |
| 502  | `POKEAPI_UNAVAILABLE`  | Timeout, red o `5xx` desde PokeAPI                      |
| 502  | `POKEAPI_BAD_RESPONSE` | Payload de PokeAPI no cumple schema                     |
| 503  | `DATABASE_UNAVAILABLE` | Falla de lectura/escritura en PostgreSQL                |
| 500  | `INTERNAL_ERROR`       | Error inesperado                                        |

Ejemplo:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Exactly one of \"name\" or \"pokemon\" must be provided.",
  "timestamp": "2026-07-16T21:26:32.258Z",
  "path": "/pokemon"
}
```

## Pruebas Y Calidad

Comandos globales:

```bash
pnpm lint
pnpm test:cov
pnpm build
```

Comandos por app:

```bash
pnpm --filter @pokemon-amaris/backend lint
pnpm --filter @pokemon-amaris/backend test:cov
pnpm --filter @pokemon-amaris/backend build

pnpm --filter @pokemon-amaris/frontend lint
pnpm --filter @pokemon-amaris/frontend test:cov
pnpm --filter @pokemon-amaris/frontend build
```

Umbrales:

| Métrica    | Umbral |
| ---------- | ------ |
| Lines      | 85%    |
| Statements | 85%    |
| Functions  | 85%    |
| Branches   | 80%    |

Última validación local de Fase 4:

- Backend: statements `96.07%`, branches `80.53%`, functions `93.84%`, lines `95.82%`.
- Frontend: statements `92.8%`, branches `85.32%`, functions `92.45%`, lines `92.8%`.

## CI/CD

GitHub Actions ejecuta en cada PR y push a `main`:

- `ci/backend`: install, lint, coverage, build, artefactos de coverage/dist.
- `ci/frontend`: install, lint, coverage, build, artefactos de coverage/dist.
- `ci/backend-openapi`: Postgres efímero, `prisma:push`, arranque de backend y publicación de `openapi.json`.
- `ci/summary`: resumen de checks y cobertura en PR.
- `docker/build-images`: buildx para imágenes backend/frontend.
- `codeql/analyze`: análisis opcional.

Branch protection recomendado en [`.github/BRANCH_PROTECTION.md`](.github/BRANCH_PROTECTION.md).

## Decisiones Técnicas

ADRs principales:

- [`0001` Monorepo pnpm](docs/adr/0001-monorepo-pnpm.md)
- [`0002` PostgreSQL + Prisma](docs/adr/0002-postgres-prisma.md)
- [`0003` Arquitectura hexagonal](docs/adr/0003-arquitectura-hexagonal.md)
- [`0004` Docker Compose](docs/adr/0004-docker-compose.md)
- [`0005` GitHub Actions CI](docs/adr/0005-github-actions.md)
- [`0006` Cobertura 85/80](docs/adr/0006-cobertura-85.md)
- [`0007` Uso de IA](docs/adr/0007-ai-usage.md)
- [`0008` Repository hygiene](docs/adr/0008-repository-hygiene.md)
- [`0009` Arquitectura contextual frontend](docs/adr/0009-frontend-contextual-architecture.md)
- [`0010` Flujo HTTP frontend](docs/adr/0010-frontend-http-flow.md)
- [`0011` Backend as-built](docs/adr/0011-backend-as-built-alignment.md)

Índice completo: [`docs/adr/README.md`](docs/adr/README.md).

## Uso De IA

El proyecto usó asistencia de IA para estructurar fases, contrastar documentos, acelerar scaffolding y revisar consistencia. Las decisiones aceptadas quedaron documentadas en ADRs y verificadas con comandos locales.

Ver [`docs/adr/0007-ai-usage.md`](docs/adr/0007-ai-usage.md).

## Diagramas

- Vista renderizada: [`docs/DIAGRAM.md`](docs/DIAGRAM.md)
- Fuentes Mermaid:
  - [`docs/diagrams/sequence.mmd`](docs/diagrams/sequence.mmd)
  - [`docs/diagrams/architecture.mmd`](docs/diagrams/architecture.mmd)
