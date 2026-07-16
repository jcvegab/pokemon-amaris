# DIAGRAM — implementación

## 1. Objetivo

Ilustrar la solución construida con un diagrama de secuencia Mermaid
que cubra el camino feliz, el caso de duplicado, las fallas de
PokeAPI, los datos faltantes y las fallas de PostgreSQL, más un
diagrama de arquitectura por capas (incluye frontend contextual).

## 2. Decisiones

| Aspecto     | Decisión                                                                             |
| ----------- | ------------------------------------------------------------------------------------ |
| Tipo        | Diagrama de secuencia + diagrama de arquitectura (flowchart)                         |
| Formato     | Mermaid embebido en este documento (GitHub renderiza directo)                        |
| Herramienta | Mermaid renderizado por GitHub Markdown                                              |
| Ubicación   | `docs/DIAGRAM.md` (vista); fuente versionada en `docs/diagrams/*.mmd` cuando se cree |

> El plan original preveía archivos fuente en `docs/diagrams/`. La
> implementación actual mantiene los bloques Mermaid dentro de
> `DIAGRAM.md` para evitar referencias que GitHub no resuelve. Cuando
> se introduzcan nuevos diagramas, se añadirá su `.mmd` aparte.

## 3. Flujo implementado

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario
    participant FE as Frontend (React)
    participant Hook as useCreatePokemon
    participant Creator as PokemonCreator
    participant Repo as ApiPokemonRepository
    participant BE as Backend (NestJS)
    participant DB as PostgreSQL
    participant API as PokeAPI

    User->>FE: Escribe "pikachu" y envía
    FE->>FE: Valida input (no vacío)
    FE->>Hook: submit()
    Hook->>Creator: execute({ rawName: "pikachu" })
    Creator->>Creator: parseName (trim + lowercase + regex)
    Creator->>Repo: findByName(name)
    Repo->>BE: GET /api/pokemon/pikachu
    alt Backend 200 (existe en DB)
        BE-->>Repo: 200 { id, name, height, weight, types, createdAt }
        Repo-->>Creator: Pokemon (createdAt conservado)
        Creator-->>Hook: { pokemon, created: false }
        Hook-->>FE: { status: success, pokemon }
        FE-->>User: Banner éxito + ficha
    else Backend 404 (no existe en DB)
        BE-->>Repo: 404
        Repo-->>Creator: null
        Creator->>Repo: create(name)
        Repo->>BE: POST /api/pokemon { name: "pikachu" }
        BE->>DB: SELECT por name
        DB-->>BE: Registro
        alt Existe en DB (race)
            BE-->>Repo: 200 { ... }
            Repo-->>Creator: { pokemon, created: false }
            Hook-->>FE: { status: success, pokemon }
            FE-->>User: Banner éxito + ficha
        else No existe
            BE->>API: GET /pokemon/pikachu
            alt 404
                API-->>BE: 404
                BE-->>Repo: 404 POKEMON_NOT_FOUND
                Repo-->>Creator: PokemonError
            else Timeout / 5xx
                API--xBE: Sin respuesta
                BE-->>Repo: 502 POKEAPI_UNAVAILABLE
            else Payload inválido
                API-->>BE: 200 datos faltantes
                BE-->>Repo: 502 POKEAPI_BAD_RESPONSE
            else 200 OK
                API-->>BE: { id, name, height, weight, types }
                BE->>BE: Valida con zod
                BE->>DB: UPSERT pokemons
                alt DB OK
                    DB-->>BE: Registro creado
                    BE-->>Repo: 201 + PokemonResponse
                    Repo-->>Creator: { pokemon, created: true }
                    Hook-->>FE: { status: success, pokemon }
                    FE-->>User: Banner éxito + ficha
                else DB down
                    DB--xBE: Conexión rechazada
                    BE-->>Repo: 503 DATABASE_UNAVAILABLE
                end
            end
        end
    end
```

Notas del flujo:

- El frontend hace `GET /api/pokemon/:name` antes del `POST` para
  evitar invocaciones innecesarias cuando el Pokémon ya está
  persistido (decisión registrada en ADR `0010`).
- El backend puede responder `200` o `201` al `POST`; el frontend
  interpreta `200` como duplicado y `201` como creación.
- El `AbortController` del hook descarta resultados tardíos pero
  **no** se inyecta en el adaptador HTTP (ADR `0010`).
- La respuesta de éxito se valida contra el schema PokeAPI
  (`types: [{ slot, type: { name, url } }]`); `createdAt` se
  extrae por separado y se tolera ausente.

## 4. Arquitectura por capas

```mermaid
flowchart LR
    subgraph Cliente
        Browser[React 19 + Vite + Tailwind 4]
    end
    subgraph Frontend
        UI[ui: pages, components, hooks, presenters]
        App[app: App + composition-root]
        AppCtx[Contexts/Pokemon/application: PokemonCreator + PokemonRepository port]
        Infra[Contexts/Pokemon/infrastructure: ApiPokemonRepository + zod schemas + mappers]
        Domain[Contexts/Pokemon/domain: Pokemon, PokemonName, PokemonError]
        Shared[Contexts/Shared: env, httpErrors]
    end
    subgraph Servidor
        Nginx[Nginx: proxy /api/* + /healthz]
        Nest[NestJS 11]
        Prisma[Prisma Client]
    end
    subgraph Datos
        Postgres[(PostgreSQL 17)]
        PokeAPI[(PokeAPI)]
    end

    Browser --> UI
    UI --> AppCtx
    App --> AppCtx
    AppCtx --> Infra
    AppCtx --> Domain
    Infra --> Shared
    UI --> Shared
    Browser -- HTTPS --> Nginx
    Nginx -- /api/* --> Nest
    Nginx -- /healthz --> Nginx
    Nest -- Prisma --> Prisma
    Prisma -- driver SQL --> Postgres
    Nest -- HTTPS --> PokeAPI
```

Notas:

- El frontend sigue el patrón `ui → application → port ←
infrastructure → domain` por bounded context
  (`Contexts/Pokemon`, `Contexts/Shared`).
- `PokemonRepository` es el puerto; `ApiPokemonRepository` es el
  adaptador HTTP. Los tests usan `InMemoryPokemonRepository`.
- El composition root (`src/app/composition-root.ts`) ensambla
  `ApiPokemonRepository` + `PokemonCreator` y los inyecta en
  `HomePage`.
- Nginx proxifica cualquier `/api/*` (no solo `/api/pokemon`); ver
  ADR `0004`.

## 5. Criterios de aceptación

- [ ] `docs/DIAGRAM.md` muestra ambos diagramas renderizados en
      GitHub.
- [ ] La secuencia cubre `GET /api/pokemon/:name` previo al `POST`,
      éxito (201), duplicado (200), 404, timeout, payload inválido
      y fallo de DB.
- [ ] El diagrama de arquitectura muestra las capas del frontend
      (`ui` / `application` / `infrastructure` / `domain`),
      `Contexts/Shared`, Nginx, Nest, Prisma, PostgreSQL y PokeAPI,
      sin conexiones duplicadas.
- [ ] Sin dependencia de herramientas externas (solo Mermaid).
- [ ] Los archivos `docs/diagrams/*.mmd` se mantienen como fuente
      cuando se generen.

## 6. Entregables

- `docs/DIAGRAM.md` (vista renderizada con Mermaid embebido).
- `docs/diagrams/sequence.mmd` y `docs/diagrams/architecture.mmd`
  como fuente (a crear cuando se versionen aparte).
