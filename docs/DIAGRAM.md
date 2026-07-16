# PLAN — DIAGRAM

## 1. Objetivo
Ilustrar la solución implementada con un diagrama de secuencia Mermaid que cubra el camino feliz, el caso de duplicado, las fallas de PokeAPI, los datos faltantes y las fallas de PostgreSQL.

## 2. Decisiones

| Aspecto | Decisión |
| --- | --- |
| Tipo | Diagrama de secuencia (preferencia del enunciado) |
| Formato | Mermaid (texto versionado en `docs/diagrams/sequence.mmd`) |
| Herramienta | Mermaid renderizado por GitHub Markdown |
| Ubicación | `docs/DIAGRAM.md` (vista) + `docs/diagrams/sequence.mmd` (fuente) |

## 3. Diagrama principal (`docs/diagrams/sequence.mmd`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario
    participant FE as Frontend (React)
    participant BE as Backend (NestJS)
    participant DB as PostgreSQL
    participant API as PokeAPI

    User->>FE: Escribe "pikachu" y envía
    FE->>FE: Valida payload (name|pokemon)
    alt Payload inválido
        FE-->>User: 400 "Revisa el nombre"
    else Payload válido
        FE->>BE: POST /pokemon { name }
        BE->>BE: Normaliza (trim, lowercase)
        BE->>DB: SELECT * WHERE name = ?
        alt Pokémon existe
            DB-->>BE: Registro
            BE-->>FE: 200 OK + PokemonResponse
            FE-->>User: Banner éxito + tarjeta
        else No existe
            BE->>API: GET /pokemon/pikachu
            alt Timeout / 5xx
                API--xBE: Sin respuesta
                BE-->>FE: 502 "PokeAPI no disponible"
                FE-->>User: Banner error
            else 404
                API-->>BE: 404 Not Found
                BE-->>FE: 404 "No encontrado"
                FE-->>User: Banner error
            else 200 con payload inválido
                API-->>BE: Datos faltantes
                BE-->>FE: 502 "Respuesta inesperada"
                FE-->>User: Banner error
            else 200 OK
                API-->>BE: { id, name, height, weight, types }
                BE->>BE: Valida con zod y mapea
                BE->>DB: INSERT pokemons (...)
                alt Error de DB
                    DB--xBE: Conexión rechazada
                    BE-->>FE: 503 "Servicio no disponible"
                    FE-->>User: Banner error
                else OK
                    DB-->>BE: Registro creado
                    BE-->>FE: 201 Created + PokemonResponse
                    FE-->>User: Banner éxito + tarjeta
                end
            end
        end
    end
```

## 4. Diagrama de arquitectura (complementario)

`docs/diagrams/architecture.mmd`:

```mermaid
flowchart LR
    subgraph Cliente
        Browser[React 19 + Vite]
    end
    subgraph Servidor
        Nginx[Nginx: proxy /api]
        Nest[NestJS 11]
        Prisma[Prisma Client]
    end
    subgraph Datos
        Postgres[(PostgreSQL 17)]
        PokeAPI[(PokeAPI)]
    end
    Browser -- HTTPS --> Nginx
    Nginx -- /api/pokemon --> Nest
    Nest -- Prisma --> Prisma
    Prisma -- driver SQL --> Postgres
    Nest -- HTTPS --> PokeAPI
```

> **Nota de corrección:** la conexión real es `NestJS → Prisma → PostgreSQL`. La conexión directa `NestJS → PostgreSQL` (sin Prisma) del diagrama anterior era incorrecta y queda eliminada.

## 5. Renderizado en `docs/DIAGRAM.md`

El archivo `DIAGRAM.md` incrusta los bloques Mermaid directamente (no usa `include` ni referencias a archivos externos, ya que GitHub no resuelve esas rutas). Los archivos `docs/diagrams/*.mmd` se mantienen como fuente versionada.

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario
    participant FE as Frontend (React)
    participant BE as Backend (NestJS)
    participant DB as PostgreSQL
    participant API as PokeAPI

    User->>FE: Escribe "pikachu" y envía
    FE->>FE: Valida payload
    alt Payload inválido
        FE-->>User: 400 "Revisa el nombre"
    else Payload válido
        FE->>BE: POST /api/pokemon { name }
        BE->>BE: Normaliza (trim, lowercase)
        BE->>DB: SELECT * WHERE name = ?
        alt Pokémon existe
            DB-->>BE: Registro
            BE-->>FE: 200 OK + PokemonResponse
            FE-->>User: Banner éxito + tarjeta
        else No existe
            BE->>API: GET /pokemon/pikachu
            alt Timeout / 5xx
                API--xBE: Sin respuesta
                BE-->>FE: 502 "PokeAPI no disponible"
                FE-->>User: Banner error
            else 404
                API-->>BE: 404 Not Found
                BE-->>FE: 404 "No encontrado"
                FE-->>User: Banner error
            else 200 con payload inválido
                API-->>BE: Datos faltantes
                BE-->>FE: 502 "Respuesta inesperada"
                FE-->>User: Banner error
            else 200 OK
                API-->>BE: { id, name, height, weight, types }
                BE->>BE: Valida con zod y mapea
                BE->>DB: UPSERT pokemons (...)
                alt Error de DB
                    DB--xBE: Conexión rechazada
                    BE-->>FE: 503 "Servicio no disponible"
                    FE-->>User: Banner error
                else OK
                    DB-->>BE: Registro creado
                    BE-->>FE: 201 Created + PokemonResponse
                    FE-->>User: Banner éxito + tarjeta
                end
            end
        end
    end
```

```mermaid
flowchart LR
    subgraph Cliente
        Browser[React 19 + Vite]
    end
    subgraph Servidor
        Nginx[Nginx: proxy /api]
        Nest[NestJS 11]
        Prisma[Prisma Client]
    end
    subgraph Datos
        Postgres[(PostgreSQL 17)]
        PokeAPI[(PokeAPI)]
    end
    Browser -- HTTPS --> Nginx
    Nginx -- /api/pokemon --> Nest
    Nest -- Prisma --> Prisma
    Prisma -- driver SQL --> Postgres
    Nest -- HTTPS --> PokeAPI
```

## 6. Criterios de aceptación

- [ ] `docs/DIAGRAM.md` muestra ambos diagramas renderizados en GitHub.
- [ ] La secuencia cubre éxito (201), duplicado (200), 404, timeout, payload inválido y fallo de DB.
- [ ] El diagrama de arquitectura muestra los 3 servicios y la red entre ellos sin conexiones duplicadas.
- [ ] Sin dependencia de herramientas externas (solo Mermaid).
- [ ] Los archivos `docs/diagrams/*.mmd` se mantienen como fuente.

## 7. Entregables

- `docs/DIAGRAM.md` (vista renderizada con Mermaid embebido).
- `docs/diagrams/sequence.mmd` (fuente).
- `docs/diagrams/architecture.mmd` (fuente).
