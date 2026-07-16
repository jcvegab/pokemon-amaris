# PLAN — CI

## 1. Objetivo

Definir el pipeline de integración continua en GitHub Actions y los artefactos de entrega del punto 5 de `DEFINITION.md`: `docker-compose.yml`, Dockerfiles, `README.md` y repositorio privado.

## 2. Decisiones

| Aspecto           | Decisión                               |
| ----------------- | -------------------------------------- |
| Proveedor CI      | GitHub Actions                         |
| Disparadores      | `pull_request` y `push` a `main`       |
| Gestor            | `pnpm` con `corepack`                  |
| Cache             | `actions/setup-node` + `cache: 'pnpm'` |
| Versionado Node   | `24.x`                                 |
| Cobertura         | `> 85%` en backend y frontend          |
| Build de imágenes | `docker buildx` por aplicación         |
| Compose           | `docker compose v2`                    |

## 3. Estructura `.github/`

```
.github/
├── workflows/
│   ├── ci.yml                # Lint, test, build, cobertura
│   ├── docker.yml            # Build de imágenes backend y frontend
│   └── codeql.yml            # Análisis estático opcional
├── dependabot.yml            # Actualizaciones automáticas
├── pull_request_template.md  # Plantilla de PR
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
└── CODEOWNERS                # Responsables por área
```

## 4. Pipeline `ci.yml`

Jobs (todos se ejecutan en cada PR y push a `main`; **no** se usa detección de cambios):

1. **backend**:
   - `pnpm install --frozen-lockfile` (raíz).
   - `pnpm --filter @pokemon-amaris/backend lint`.
   - `pnpm --filter @pokemon-amaris/backend test:cov`.
   - Sube `apps/backend/coverage` como artefacto.
   - Falla si cobertura < umbral.
2. **frontend**:
   - `pnpm install --frozen-lockfile` (raíz).
   - `pnpm --filter @pokemon-amaris/frontend lint`.
   - `pnpm --filter @pokemon-amaris/frontend test:cov`.
   - `pnpm --filter @pokemon-amaris/frontend build`.
   - Sube `apps/frontend/coverage` y `dist/` como artefactos.
3. **backend-openapi** (tras `backend`):
   - Reutiliza el `dist/` construido por el job `backend`.
   - Levanta Postgres efímero con `services: postgres: image: postgres:17-alpine` y `DATABASE_URL` apuntando a él.
   - Ejecuta `pnpm prisma:push` y luego `node dist/main.js &` en background.
   - `wait-on http://localhost:3000/docs-json`.
   - `curl -fsS http://localhost:3000/docs-json -o openapi.json`.
   - Sube `openapi.json` como artefacto del workflow.
4. **summary**: combina resultados y publica un comentario en el PR con cobertura.

Permisos: `contents: read`, `pull-requests: write` (para resumen).

> **Decisión:** se descarta la detección de cambios para mantener la lógica simple. Siempre se ejecutan backend y frontend. La OpenAPI se genera contra una DB efímera en el job, no requiere servicios externos.

## 5. Pipeline `docker.yml`

- Dispara en `push` a `main` y `pull_request` con etiqueta `docker`.
- Construye imágenes `backend` y `frontend` con `docker/build-push-action`.
- Etiqueta con `gitsha`, `branch` y `latest` solo en `main`.
- No publica (repositorio privado) salvo que se configure registry.

## 6. `docker-compose.yml` (raíz)

Servicios:

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 5s
      timeout: 5s
      retries: 10
    ports:
      - '5432:5432'

  db-init:
    image: node:24-alpine
    working_dir: /app
    volumes:
      - .:/app
    command:
      [
        'sh',
        '-c',
        'corepack enable && pnpm install --frozen-lockfile --filter @pokemon-amaris/backend... && pnpm --filter @pokemon-amaris/backend prisma:push',
      ]
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    depends_on:
      db:
        condition: service_healthy
    restart: 'no'

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    environment:
      PORT: 3000
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      POKEAPI_BASE_URL: ${POKEAPI_BASE_URL}
      POKEAPI_TIMEOUT_MS: ${POKEAPI_TIMEOUT_MS}
      NODE_ENV: production
    depends_on:
      db-init:
        condition: service_completed_successfully
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://localhost:3000/health || exit 1']
      interval: 10s
      timeout: 5s
      retries: 6
    ports:
      - '3000:3000'

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - '8080:80'

volumes:
  pgdata:
```

Notas:

- `db-init` ejecuta `prisma db push` y termina. El backend solo arranca después de que el esquema exista.
- `frontend` expone 8080 hacia 80 interno (nginx).
- `nginx.conf` proxifica `/api/pokemon` a `http://backend:3000/pokemon` y sirve `dist/`.
- `BACKEND_PORT` queda fuera del contrato. El host publica el contenedor en `3000` (backend) y `8080` (frontend) vía `docker-compose.yml`.

## 7. `README.md`

Secciones obligatorias:

1. Descripción breve del reto.
2. Arquitectura (resumen, ver `DIAGRAM.md`).
3. Stack y versiones.
4. Prerrequisitos: Node 24, pnpm 10, Docker, Docker Compose v2.
5. **Ejecución con Docker Compose**:
   ```bash
   cp .env.example .env
   docker compose up --build
   ```
   Frontend en `http://localhost:8080`, backend en `http://localhost:3000`.
6. **Ejecución local** (sin Docker):
   ```bash
   pnpm install
   docker compose up -d db
   pnpm --filter @pokemon-amaris/backend prisma:push
   pnpm dev
   ```
7. **Endpoint**:
   - `POST /pokemon`.
   - Acepta `{ "name": "pikachu" }` o `{ "pokemon": "pikachu" }`.
   - Ejemplo `curl` con respuesta.
   - Tabla de errores.
8. **Pruebas**:
   - `pnpm test`, `pnpm test:cov`.
   - Umbrales y reportes.
9. **Decisiones técnicas** con enlaces a ADRs en `docs/adr/`.
10. **Uso de IA**: enlace a `docs/adr/0007-ai-usage.md` (transparencia).
11. **Diagrama**: referencia a `docs/DIAGRAM.md`.

## 8. Umbrales de cobertura

Aplicados tanto en Jest como en Vitest y verificados en CI:

```jsonc
{
  "coverageThreshold": {
    "global": {
      "lines": 85,
      "statements": 85,
      "functions": 85,
      "branches": 80,
    },
  },
}
```

Si una app cae por debajo, el job falla y se publica el reporte como artefacto.

## 9. Repository Hygiene

Gobierno del repo y automatización de mantenimiento. Cubre todo lo que vive bajo `.github/` y la configuración de la rama `main`.

### 9.1 `dependabot.yml`

Escanea `npm`/`pnpm`, `github-actions` y `docker` agrupando parches y menores en un solo PR por paquete.

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '09:00'
      timezone: 'America/Lima'
    grouping:
      patch:
        patterns: ['*']
        update-types: ['minor', 'patch']
    open-pull-requests-limit: 5
    labels: ['dependencies', 'chore']
    commit-message:
      prefix: 'chore(deps)'
    ignore:
      - dependency-name: '@nestjs/core'
        versions: ['11.x']

  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
    labels: ['dependencies', 'ci']
    commit-message:
      prefix: 'ci(actions)'

  - package-ecosystem: 'docker'
    directory: '/'
    schedule:
      interval: 'weekly'
    labels: ['dependencies', 'docker']
    commit-message:
      prefix: 'chore(docker)'
```

### 9.2 `pull_request_template.md`

Fuerza resumen, pruebas, impacto y checklist antes de pedir review.

````md
## Resumen

<!-- 1-3 líneas: qué cambia y por qué -->

## Tipo de cambio

- [ ] `feat` nueva funcionalidad
- [ ] `fix` corrección de bug
- [ ] `refactor` sin cambio de comportamiento
- [ ] `docs` solo documentación
- [ ] `test` solo pruebas
- [ ] `chore` tooling / config

## Cambios

<!-- lista de cambios principales -->

## Cómo probar

```bash
# comandos exactos
```
````

- [ ] Probado en local
- [ ] Tests añadidos/actualizados
- [ ] Cobertura ≥ 85% (`apps/<app>/coverage/index.html`)

## UI

<!-- obligatorio si hay cambio visible -->

- [ ] Adjunto screenshot o GIF
- [ ] Revisado en mobile y desktop

## Riesgos y rollback

<!-- qué puede romper, cómo revertir -->

## Checklist

- [ ] Lint pasa
- [ ] Tests pasan
- [ ] Sin secretos en el diff
- [ ] ADR actualizado si cambia decisión de diseño

````

### 9.3 `ISSUE_TEMPLATE/bug_report.md` y `feature_request.md`

Plantillas mínimas que obligan a reportar entorno, pasos para reproducir, comportamiento esperado vs actual, y screenshot cuando aplique.

### 9.4 `CODEOWNERS`

Asigna revisores por área. Como el repo es de un solo autor, define un placeholder con el `username` y queda listo para escalar.

```text
# Default
*       @jcvegab

# Backend
/apps/backend/   @jcvegab
/docs/BACKEND.md  @jcvegab

# Frontend
/apps/frontend/  @jcvegab
/docs/FRONTEND.md @jcvegab

# CI / infra
/.github/        @jcvegab
/docker-compose.yml @jcvegab
/docs/CI.md      @jcvegab
````

### 9.5 Branch protection en `main`

Configuración esperada en GitHub → Settings → Branches → `main`:

| Regla                               | Valor                                     |
| ----------------------------------- | ----------------------------------------- |
| Require pull request before merging | sí, ≥ 1 aprobador                         |
| Require approvals                   | 1                                         |
| Dismiss stale approvals on new push | sí                                        |
| Require status checks to pass       | `ci/backend`, `ci/frontend`, `ci/summary` |
| Require branches to be up to date   | sí                                        |
| Require linear history              | sí                                        |
| Require signed commits              | opcional                                  |
| Include administrators              | sí                                        |
| Allow force pushes                  | no                                        |
| Allow deletions                     | no                                        |

Permisos del GITHUB_TOKEN: `contents: read`, `pull-requests: write`, `checks: write`, `security-events: read` (CodeQL).

## 10. ADRs

- `docs/adr/0001-monorepo-pnpm.md`
- `docs/adr/0002-postgres-prisma.md`
- `docs/adr/0003-arquitectura-hexagonal.md`
- `docs/adr/0004-docker-compose.md`
- `docs/adr/0005-github-actions.md`
- `docs/adr/0008-repository-hygiene.md`
- `docs/adr/0006-cobertura-85.md`
- `docs/adr/0007-ai-usage.md`

## 11. Criterios de aceptación

- [ ] `docker compose up --build` arranca los tres servicios sin intervención.
- [ ] Frontend puede enviar un nombre y ver la respuesta persistida.
- [ ] CI corre lint, tests, cobertura y build en cada PR.
- [ ] Imágenes Docker construyen sin warnings críticos.
- [ ] `README.md` documenta ejecución, endpoint, errores y decisiones.
- [ ] Repositorio configurado como privado.
- [ ] `.github/dependabot.yml` activo y agrupando parches.
- [ ] `.github/pull_request_template.md` aplicado a todos los PRs.
- [ ] `ISSUE_TEMPLATE/` listo para reportar bugs y features.
- [ ] `CODEOWNERS` cubre backend, frontend, `.github/` y docs.
- [ ] Branch protection exige CI verde y ≥ 1 aprobador.

## 12. Entregables

- `.github/workflows/ci.yml` y `docker.yml`.
- `.github/dependabot.yml`.
- `.github/pull_request_template.md`.
- `.github/ISSUE_TEMPLATE/bug_report.md` y `feature_request.md`.
- `.github/CODEOWNERS`.
- `docker-compose.yml` en la raíz.
- `Dockerfile` en `apps/backend` y `apps/frontend`.
- `README.md` completo.
- ADRs en `docs/adr/`.
