# PLAN — STRUCTURE

## 1. Objetivo
Definir la base del monorepo, gestor de paquetes, organización de carpetas, herramientas comunes y convenciones de desarrollo que serán consumidas por `BACKEND.md`, `FRONTEND.md` y `CI.md`.

## 2. Decisiones de plataforma

| Aspecto | Decisión |
| --- | --- |
| Gestor de paquetes | `pnpm` v10 con workspaces |
| Versión de Node | 24 LTS |
| Lenguaje | TypeScript 6.x (estricto) |
| Estructura | Monorepo único (privado) |
| Formato de módulos | ESM en backend y frontend |
| Calidad de código | ESLint + Prettier compartidos |
| Hooks | Husky + lint-staged |
| Commits | Conventional Commits |
| Ramas | `trunk-based` con PRs cortos |
| Prioridad de versiones | Actualizar a versiones estables compatibles si las del enunciado no existen o no son compatibles; registrar el cambio en ADR |

## 3. Layout del monorepo

```
pokemon-amaris/
├── apps/
│   ├── backend/                # NestJS 11 (ver BACKEND.md)
│   └── frontend/               # React 19 + Vite + Tailwind 4 (ver FRONTEND.md)
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   └── diagrams/               # Fuentes de diagramas
├── .github/
│   └── workflows/              # Pipelines (ver CI.md)
├── .editorconfig
├── .gitignore
├── .nvmrc                      # 24
├── .npmrc                      # shamefully-hoist=false, strict-peer-dependencies=true
├── package.json                # Raíz del workspace
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.mjs
├── .prettierrc.json
├── README.md
└── DEFINITION.md
```

## 4. `package.json` raíz

```jsonc
{
  "name": "pokemon-amaris",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.x",
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=10.0.0"
  },
  "scripts": {
    "dev": "pnpm -r --parallel --stream run dev",
    "build": "pnpm -r run build",
    "lint": "pnpm -r run lint",
    "test": "pnpm -r run test",
    "test:cov": "pnpm -r run test:cov",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"",
    "prepare": "husky"
  }
}
```

## 5. `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
```

## 6. `tsconfig.base.json` compartido

```jsonc
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

Cada aplicación extiende este `tsconfig.base.json` y agrega su `include` propio.

> **Nota:** la versión de TypeScript es la 6.x estable. Ver `docs/adr/0001-monorepo-pnpm.md`.

## 7. Convenciones generales

- **Naming**: `kebab-case` en carpetas y archivos, `PascalCase` en clases/componentes, `camelCase` en variables/funciones.
- **Imports absolutos** dentro de cada app usando alias (`@/application`, `@/domain`, etc.).
- **Variables de entorno** validadas con `zod` en cada app.
- **Errores**: capas de dominio lanzan errores tipados; infraestructura los traduce.
- **Logs**: `pino` con formato JSON; redactar secretos.
- **Secretos**: nunca en repositorio; usar `.env.example` como plantilla.
- **Tipos compartidos**: solo contratos DTO; nada de código ejecutable compartido.

## 8. `.gitignore` mínimo

```
node_modules/
dist/
build/
coverage/
.env
.env.*
!.env.example
*.log
.DS_Store
.pnpm-store/
.idea/
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
```

## 9. Husky y lint-staged

- `.husky/pre-commit`: ejecuta `pnpm lint-staged`.
- `lint-staged` aplica ESLint + Prettier sobre archivos modificados.

## 10. Variables de entorno

Archivo `.env.example` en la raíz con valores ficticios:

```env
# Database
POSTGRES_USER=pokemon
POSTGRES_PASSWORD=pokemon
POSTGRES_DB=pokemon
POSTGRES_PORT=5432
DATABASE_URL=postgresql://pokemon:pokemon@localhost:5432/pokemon

# PokeAPI
POKEAPI_BASE_URL=https://pokeapi.co/api/v2
POKEAPI_TIMEOUT_MS=5000

# Backend
PORT=3000

# Frontend (build-time, consumidas por Vite)
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT_MS=8000
```

`apps/backend` y `apps/frontend` validan su subconjunto con `zod` al arrancar.

> **Convenciones:**
> - `PORT` es la variable interna del backend (NestJS).
> - Los puertos expuestos al host se definen en `docker-compose.yml` (no en `.env`).
> - `VITE_API_BASE_URL=/api` permite que Vite dev server y Nginx prod hagan proxy hacia el backend sin CORS.
> - `BACKEND_PORT` y `FRONTEND_PORT` del documento original quedan obsoletos.

## 11. Convenciones de rama y PR

- Branch base: `main`.
- Prefijos: `feat/`, `fix/`, `chore/`, `docs/`, `test/`, `refactor/`.
- PR con descripción, checklist de pruebas y screenshot si hay UI.

## 12. Criterios de aceptación

- [ ] `pnpm install` instala todo el monorepo sin warnings críticos.
- [ ] `pnpm dev` levanta backend y frontend en paralelo.
- [ ] `pnpm lint`, `pnpm test` y `pnpm build` funcionan desde la raíz.
- [ ] Convenciones aplicadas en ambas apps (alias, tsconfig, lint).
- [ ] Husky y lint-staged activos.
- [ ] `.env.example` versionado; ningún secreto real.
- [ ] Documentos `BACKEND.md`, `FRONTEND.md`, `CI.md` y `DIAGRAM.md` creados en `docs/`.
- [ ] Versiones de TypeScript, NestJS, Prisma y Vite son las últimas estables compatibles (ver `docs/adr/`).
- [ ] Variables de entorno usan `PORT` (backend) y `VITE_API_BASE_URL=/api` (frontend).

## 13. Entregables

- Estructura de carpetas completa.
- Configuración base de TypeScript, ESLint y Prettier.
- Hooks de Git operativos.
- `package.json` raíz con scripts orquestadores.
