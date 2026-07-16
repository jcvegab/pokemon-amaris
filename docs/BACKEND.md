# BACKEND — implementación as-built (Phase 2A)

> Documento alineado con la implementación real. Las decisiones que
> difieren del plan original se registran en
> `docs/adr/0011-backend-as-built-alignment.md`.

## 1. Objetivo

Implementar el servicio en NestJS 11 que consulta la PokeAPI, persiste
información de Pokémon en PostgreSQL 17 mediante Prisma, y expone los
endpoints `POST /pokemon` y `GET /health` con validación, manejo de
errores y pruebas.

## 2. Decisiones técnicas

| Aspecto            | Decisión                                                                   |
| ------------------ | -------------------------------------------------------------------------- |
| Framework          | NestJS 11 (última estable compatible)                                      |
| Lenguaje           | TypeScript efectivo `^5.7.2` (workspace root)                              |
| Runtime            | Node 24 LTS                                                                |
| Sistema de módulos | CommonJS (`"type": "commonjs"`, `module: "CommonJS"`)                      |
| Base de datos      | PostgreSQL 17                                                              |
| ORM                | Prisma 5.22 (`prisma-client-js`)                                           |
| Inicialización DB  | `prisma db push` (sin migraciones)                                         |
| Cliente HTTP       | `@nestjs/axios` (`HttpService` con `axios` subyacente)                     |
| API docs           | `@nestjs/swagger` con CLI plugin, UI en `/docs`                            |
| Health checks      | `@nestjs/terminus` con indicador propio de base de datos                   |
| Validación         | `class-validator` + `class-transformer` con `ValidationPipe` global        |
| Logger             | `nestjs-pino` (`pino-http` con `pino-pretty` en no producción)             |
| Config             | `@nestjs/config` con validación `zod` (`env.schema.ts`)                    |
| Tests              | Jest + `ts-jest` (config en `jest.config.cjs`); Prisma y PokeAPI mockeados |
| Cobertura objetivo | ≥ 85% lines/statements/functions, ≥ 80% branches                           |
| Arquitectura       | Hexagonal sin CQRS, layout por bounded context (`Contexts/`)               |

## 3. Layout de `apps/backend`

```text
apps/backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── index.ts
│   ├── config/
│   │   └── env.schema.ts
│   ├── health/                                  # Excepción top-level (ver ADR 0011)
│   │   ├── health.module.ts
│   │   └── health.controller.ts
│   ├── shared/health/                           # Excepción top-level (ver ADR 0011)
│   │   └── database-health.indicator.ts
│   └── Contexts/
│       ├── Shared/
│       │   └── infrastructure/
│       │       ├── http/HttpErrorFilter.ts
│       │       └── persistence/prisma/
│       │           ├── PrismaModule.ts
│       │           └── PrismaService.ts
│       └── Pokemon/
│           ├── domain/
│           │   ├── PokemonRepository.ts
│           │   └── model/
│           │       ├── Pokemon.ts
│           │       ├── PokemonId.ts
│           │       ├── PokemonName.ts
│           │       └── PokemonTypes.ts
│           ├── application/
│           │   ├── create/PokemonCreator.ts
│           │   ├── errors/PokemonApplicationErrors.ts
│           │   └── ports/PokemonCatalog.ts
│           └── infrastructure/
│               ├── dependency-injection/
│               │   ├── PokemonModule.ts
│               │   └── PokemonTokens.ts
│               ├── http/
│               │   ├── PokemonPostController.ts
│               │   ├── PokemonResponseMapper.ts
│               │   ├── dto/
│               │   │   ├── CreatePokemonRequest.ts
│               │   │   ├── ExactlyOneFieldConstraint.ts
│               │   │   └── PokemonNameField.ts
│               │   └── response/PokemonResponse.ts
│               ├── persistence/prisma/
│               │   ├── PrismaPokemonMapper.ts
│               │   └── PrismaPokemonRepository.ts
│               └── pokeapi/
│                   ├── PokeApiHttpModule.ts
│                   ├── PokeApiPokemonCatalog.ts
│                   ├── PokeApiPokemonMapper.ts
│                   └── PokeApiPokemonSchema.ts
├── test/
│   ├── doubles/
│   │   ├── FakePokemonCatalog.ts
│   │   └── InMemoryPokemonRepository.ts
│   ├── unit/
│   │   ├── ExactlyOneFieldConstraint.test.ts
│   │   ├── HttpErrorFilter.test.ts
│   │   ├── PokeApiPokemonCatalog.test.ts
│   │   ├── PokeApiPokemonSchema.test.ts
│   │   ├── PokemonCreator.test.ts
│   │   ├── PokemonResponseMapper.test.ts
│   │   ├── PrismaPokemonMapper.test.ts
│   │   └── PrismaPokemonRepository.test.ts
│   └── integration/
│       ├── HealthHttp.test.ts
│       └── PokemonHttp.test.ts
├── .env.example
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── jest.config.cjs
├── jest.setup.cjs
├── package.json
├── Dockerfile
└── README.md
```

> `src/health/` y `src/shared/health/` quedan fuera de
> `Contexts/` deliberadamente: el indicador de DB se reutiliza por
> el módulo `Health` y centralizar el indicador evita un acoplamiento
> del bounded context `Health` con `Contexts/Shared`. Ver
> ADR `0011` §"Consequences".

## 4. Modelo de datos (Prisma)

`prisma/schema.prisma`:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Pokemon {
  id        Int      @id
  name      String   @unique
  height    Int
  weight    Int
  types     String[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("pokemons")
}
```

- `id`: ID oficial de PokeAPI (1..1024+). PK natural (no autoincrement).
- `name`: nombre normalizado en minúsculas; `UNIQUE`.
- `height` / `weight`: valores crudos de PokeAPI (decímetros /
  hectogramos).
- `types`: arreglo de strings con los tipos del Pokémon.
- **Convención**: `camelCase` en el modelo Prisma, `snake_case` en
  columnas PostgreSQL vía `@map` (TS-friendly, DB-idiomático).
- `@@map("pokemons")`: tabla en plural.
- Columnas resultantes: `id`, `name`, `height`, `weight`, `types`
  (`text[]`), `created_at`, `updated_at`.

## 5. Endpoint `POST /pokemon`

### 5.1 Request

Acepta ambos formatos:

```json
{ "name": "pikachu" }
```

```json
{ "pokemon": "pikachu" }
```

Reglas:

- Normalización: `trim()` + `toLowerCase()` (aplicada en el DTO vía
  `Transform`).
- Solo uno de los dos campos; si faltan ambos o ambos llegan,
  `400 Bad Request` (`VALIDATION_ERROR`).
- Validación de longitud (1..50), patrón `^[a-z0-9-]+$`.
- Whitelist activa: cualquier campo extra se rechaza con `400`.

### 5.1.1 DTO estricto

`src/Contexts/Pokemon/infrastructure/http/dto/CreatePokemonRequest.ts`:

```ts
import { Validate } from 'class-validator';
import { ExactlyOneFieldConstraint } from './ExactlyOneFieldConstraint';
import { PokemonNameField } from './PokemonNameField';

export class CreatePokemonRequest {
  @PokemonNameField('name')
  name?: string;

  @PokemonNameField('pokemon')
  pokemon?: string;

  @Validate(ExactlyOneFieldConstraint, ['name', 'pokemon'])
  readonly _oneOf?: never;
}
```

### 5.1.2 Decorador de campo Pokémon

`src/Contexts/Pokemon/infrastructure/http/dto/PokemonNameField.ts`
(resumen):

```ts
import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export function PokemonNameField(field: 'name' | 'pokemon'): PropertyDecorator {
  return applyDecorators(
    ApiProperty({ example: 'pikachu', required: false }),
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value), {
      toClassOnly: true,
    }),
    IsOptional(),
    IsString(),
    Length(1, 50),
    Matches(/^[a-z0-9-]+$/, {
      message: `${field} must match ^[a-z0-9-]+$`,
    }),
  );
}
```

### 5.1.3 Validador `oneOf`

`src/Contexts/Pokemon/infrastructure/http/dto/ExactlyOneFieldConstraint.ts`:

```ts
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'ExactlyOneField', async: false })
export class ExactlyOneFieldConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const [a, b] = args.constraints as [string, string];
    const obj = args.object as Record<string, unknown>;
    const hasA = obj[a] !== undefined && obj[a] !== null;
    const hasB = obj[b] !== undefined && obj[b] !== null;
    return hasA !== hasB;
  }
  defaultMessage(args: ValidationArguments): string {
    const [a, b] = args.constraints as [string, string];
    return `Exactly one of "${a}" or "${b}" must be provided.`;
  }
}
```

### 5.1.4 `ValidationPipe` global

`src/main.ts` aplica:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    stopAtFirstError: false,
    errorHttpStatusCode: 400,
  }),
);
```

Efectos:

- `whitelist`: descarta propiedades no declaradas en el DTO.
- `forbidNonWhitelisted`: rechaza con `400` si llegan campos extra.
- `forbidUnknownValues`: falla si llegan objetos sin prototipo
  controlado.
- `transform`: aplica `Type`/`Transform` declarados en el DTO.

### 5.2 Respuesta exitosa

- `201 Created`: cuando el Pokémon no existía en la base de datos y
  se acaba de persistir.
- `200 OK`: cuando el Pokémon ya existía en la base de datos y se
  devuelve el registro persistido. **No** se vuelve a consultar
  PokeAPI para registros existentes.

Cuerpo de respuesta (idéntico en ambos casos):

```json
{
  "id": 25,
  "name": "pikachu",
  "height": 4,
  "weight": 60,
  "types": ["electric"],
  "createdAt": "2026-07-16T12:00:00.000Z"
}
```

> **Manejo de concurrencia:** `PrismaPokemonRepository.save()`
> ejecuta `prisma.pokemon.create()` y captura el código `P2002`
> (unique constraint en `name`). En conflicto, vuelve a leer por
> `name` y retorna `{ pokemon, created: false }`. Si la fila no se
> encuentra tras el conflicto, propaga `PokemonPersistenceUnavailableError`.

### 5.3 Errores

| Código | Cuándo                                                                    |
| ------ | ------------------------------------------------------------------------- |
| 400    | Body inválido (sin nombre, ambos, formato incorrecto, campo extra)        |
| 404    | PokeAPI no encuentra el Pokémon (`POKEMON_NOT_FOUND`)                     |
| 502    | PokeAPI no responde, responde con `5xx`, o respuesta con formato inválido |
| 503    | No se puede escribir/leer en PostgreSQL (`DATABASE_UNAVAILABLE`)          |
| 500    | Error inesperado (`INTERNAL_ERROR`)                                       |

**Esquema uniforme de error** (devuelto por
`Contexts/Shared/infrastructure/http/HttpErrorFilter.ts`):

```json
{
  "statusCode": 400,
  "code": "INVALID_POKEMON_NAME",
  "message": "name must match ^[a-z0-9-]+$",
  "timestamp": "2026-07-16T12:00:00.000Z",
  "path": "/pokemon"
}
```

- `statusCode`: HTTP status.
- `code`: código de error estable y uppercase (`INVALID_POKEMON_NAME`,
  `POKEMON_NOT_FOUND`, `POKEAPI_UNAVAILABLE`, `POKEAPI_BAD_RESPONSE`,
  `DATABASE_UNAVAILABLE`, `INTERNAL_ERROR`, `VALIDATION_ERROR`).
- `message`: siempre `string` en la respuesta pública. Los detalles
  de validación interna se mantienen solo en logs. El filtro aplica
  mensajes públicos de la tabla `PUBLIC_ERROR_MESSAGES` para los
  errores tipados; el mensaje original queda en el log estructurado
  con `requestId`.

## 6. Endpoint `GET /health`

### 6.1 Request

No recibe body ni parámetros.

```http
GET /health
```

### 6.2 Validaciones

- **Server**: si NestJS puede ejecutar el handler, Terminus marca el
  servicio como disponible.
- **Database**: `DatabaseHealthIndicator` (en `src/shared/health/`)
  expone el check semántico `database` y oculta que internamente usa
  Prisma. La implementación corre `prisma.$queryRaw\`SELECT 1\``y
reporta`up`o`down`.
- No consulta PokeAPI; health solo valida dependencias necesarias
  para servir datos persistidos.

### 6.3 Respuesta exitosa (`200 OK`)

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" }
  }
}
```

### 6.4 Respuesta con DB caída (`503 Service Unavailable`)

```json
{
  "status": "error",
  "info": {},
  "error": {
    "database": { "status": "down" }
  },
  "details": {
    "database": { "status": "down" }
  }
}
```

### 6.5 `health/health.controller.ts`

```ts
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from '../shared/health/database-health.indicator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOkResponse({ description: 'Server and database available' })
  @ApiServiceUnavailableResponse({ description: 'Database unavailable' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.database.isHealthy('database')]);
  }
}
```

### 6.6 `shared/health/database-health.indicator.ts`

```ts
import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '../Contexts/Shared/infrastructure/persistence/prisma/PrismaService';

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly healthIndicator: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicator.check(key);

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return indicator.up();
    } catch {
      return indicator.down();
    }
  }
}
```

### 6.7 `health/health.module.ts`

```ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../Contexts/Shared/infrastructure/persistence/prisma/PrismaModule';
import { DatabaseHealthIndicator } from '../shared/health/database-health.indicator';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator],
})
export class HealthModule {}
```

### 6.8 Wiring (`app.module.ts`)

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PokemonModule } from './Contexts/Pokemon/infrastructure/dependency-injection/PokemonModule';
import { PrismaModule } from './Contexts/Shared/infrastructure/persistence/prisma/PrismaModule';
import { envSchema } from './config/env.schema';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (raw) => envSchema.parse(raw),
    }),
    LoggerModule.forRoot({/* pinoHttp: requestId, redact, etc. */}),
    PrismaModule,
    HealthModule,
    PokemonModule,
  ],
})
export class AppModule {}
```

`LoggerModule` genera un `requestId` por request (reutiliza
`x-request-id` si el cliente lo envía) y redacta
`req.headers.authorization`, `req.headers.cookie` y
`req.body.password` con `[redacted]`.

## 7. Flujo de negocio

1. `PokemonPostController` recibe `CreatePokemonRequest`.
2. `PokemonCreator.execute({ rawName })`:
   1. Normaliza el nombre (`trim()` + `toLowerCase()`) construyendo
      un `PokemonName`. Falla con
      `InvalidPokemonNameApplicationError` si la validación
      semántica lo rechaza (`400 INVALID_POKEMON_NAME`).
   2. Llama a `repository.findByName(name)`.
   3. Si existe, retorna `{ pokemon, created: false }` y el
      controlador responde `200 OK`.
   4. Si no existe, llama a `catalog.search(name)`.
   5. Si PokeAPI responde 404, el catálogo lanza
      `PokemonNotFoundError` (`404 POKEMON_NOT_FOUND`).
   6. Si PokeAPI no responde o responde 5xx, lanza
      `PokemonCatalogUnavailableError` (`502 POKEAPI_UNAVAILABLE`).
   7. Si la respuesta no pasa `pokeApiPokemonSchema`, lanza
      `PokemonCatalogBadResponseError` (`502 POKEAPI_BAD_RESPONSE`).
   8. Si el `name` del snapshot difiere del solicitado, lanza
      `PokemonNotFoundError` (defensa contra respuestas
      mal correlacionadas).
   9. Construye la entidad `Pokemon` y llama a
      `repository.save(pokemon)`.
   10. Si la DB falla, `PrismaPokemonRepository` envuelve el error
       en `PokemonPersistenceUnavailableError` (`503
DATABASE_UNAVAILABLE`).
   11. Retorna `{ pokemon, created: true }`; el controlador responde
       `201 Created`.

## 8. Adaptador PokeAPI

- URL: `GET {POKEAPI_BASE_URL}/pokemon/{name}`.
- Módulo: `PokeApiHttpModule` (propio del bounded context) con
  `baseURL: POKEAPI_BASE_URL`, `timeout: POKEAPI_TIMEOUT_MS`,
  `headers: { 'Content-Type': 'application/json' }`,
  `maxRedirects: 0` y `validateStatus: status >= 200 && < 300`.
- Inyección: `PokeApiPokemonCatalog` (adaptador del puerto
  `PokemonCatalog`) recibe `HttpService` por constructor y usa
  `firstValueFrom(http.get(...))`.
- Mapeo: `PokeApiPokemonSchema` valida con `zod` los campos
  persistidos y `PokeApiPokemonMapper.toSnapshot()` proyecta
  `types: [{ slot, type: { name, url } }]` a `types: string[]`.
- Cancelación: la implementación actual no propaga `AbortSignal`
  al request HTTP. Si el cliente cancela, la request puede
  completarse o expirar por `timeout`. La cancelación real es
  una mejora futura (ver ADR `0010`).

### 8.1 `Contexts/Pokemon/infrastructure/pokeapi/PokeApiHttpModule.ts`

```ts
import { HttpModule as NestHttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PokeApiPokemonCatalog } from './PokeApiPokemonCatalog';

@Module({
  imports: [
    NestHttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const baseURL = config.getOrThrow<string>('POKEAPI_BASE_URL');
        const timeout = config.get<number>('POKEAPI_TIMEOUT_MS') ?? 5000;
        return {
          baseURL,
          timeout,
          headers: { 'Content-Type': 'application/json' },
          maxRedirects: 0,
          validateStatus: (status: number) => status >= 200 && status < 300,
        };
      },
    }),
  ],
  providers: [PokeApiPokemonCatalog],
  exports: [PokeApiPokemonCatalog, NestHttpModule],
})
export class PokeApiHttpModule {}
```

### 8.2 `Contexts/Pokemon/infrastructure/dependency-injection/PokemonModule.ts`

```ts
import { Module, type Provider } from '@nestjs/common';
import { PokemonCreator } from '../../application/create/PokemonCreator';
import { PokemonPostController } from '../http/PokemonPostController';
import { PokeApiHttpModule } from '../pokeapi/PokeApiHttpModule';
import { PokeApiPokemonCatalog } from '../pokeapi/PokeApiPokemonCatalog';
import { PrismaPokemonRepository } from '../persistence/prisma/PrismaPokemonRepository';
import { POKEMON_CATALOG, POKEMON_CREATOR, POKEMON_REPOSITORY } from './PokemonTokens';

const pokemonRepositoryProvider: Provider = {
  provide: POKEMON_REPOSITORY,
  useClass: PrismaPokemonRepository,
};

const pokemonCatalogProvider: Provider = {
  provide: POKEMON_CATALOG,
  useClass: PokeApiPokemonCatalog,
};

const pokemonCreatorProvider: Provider = {
  provide: POKEMON_CREATOR,
  inject: [POKEMON_REPOSITORY, POKEMON_CATALOG],
  useFactory: (repository, catalog) => new PokemonCreator(repository, catalog),
};

@Module({
  imports: [PokeApiHttpModule],
  controllers: [PokemonPostController],
  providers: [
    PrismaPokemonRepository,
    pokemonRepositoryProvider,
    pokemonCatalogProvider,
    pokemonCreatorProvider,
  ],
})
export class PokemonModule {}
```

`PokemonTokens.ts` exporta los símbolos:

```ts
export const POKEMON_REPOSITORY = Symbol('PokemonRepository');
export const POKEMON_CATALOG = Symbol('PokemonCatalog');
export const POKEMON_CREATOR = Symbol('PokemonCreator');
```

### 8.3 Mapeo de respuesta PokeAPI (`PokeApiPokemonSchema.ts`)

Mapeo TypeScript + Zod del endpoint
`GET https://pokeapi.co/api/v2/pokemon/<name>`. Solo valida los campos
que el dominio persiste (`id`, `name`, `height`, `weight`, `types`);
el resto de la respuesta de PokeAPI se ignora por stripping
implícito de `z.object()`.

```ts
import { z } from 'zod';

const namedApiResourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
});

export const pokeApiPokemonSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  height: z.number().int().nonnegative(),
  weight: z.number().int().nonnegative(),
  types: z
    .array(
      z.object({
        slot: z.number().int().positive(),
        type: namedApiResourceSchema,
      }),
    )
    .min(1),
});

export type PokeApiPokemon = z.infer<typeof pokeApiPokemonSchema>;
```

Reglas de validación:

- `id`: entero positivo (1..1024+).
- `name`: string no vacío.
- `height` / `weight`: enteros no negativos (decímetros /
  hectogramos en PokeAPI).
- `types`: arreglo no vacío de `{ slot, type: { name, url } }`;
  `PokeApiPokemonMapper.toSnapshot()` proyecta a `string[]` con
  `type.name`.
- Cualquier campo adicional de PokeAPI (`sprites`, `moves`,
  `abilities`, `cries`, etc.) se descarta por Zod sin error.

### 8.4 `PokeApiPokemonCatalog.ts` (resumen)

```ts
@Injectable()
export class PokeApiPokemonCatalog implements PokemonCatalog {
  constructor(private readonly http: HttpService) {}

  async search(name: PokemonName): Promise<PokemonSnapshot> {
    const response = await this.fetchResponse(name);
    const parsed = pokeApiPokemonSchema.safeParse(response.data);
    if (!parsed.success) {
      this.logger.warn({
        msg: 'PokeAPI response failed schema',
        name: name.value,
        issues: parsed.error.issues,
      });
      throw new PokemonCatalogBadResponseError('PokeAPI response did not match expected schema');
    }
    return PokeApiPokemonMapper.toSnapshot(parsed.data);
  }

  private async fetchResponse(name: PokemonName): Promise<{ data: unknown }> {
    try {
      const request = this.http.get(`/pokemon/${encodeURIComponent(name.value)}`);
      return await firstValueFrom(request);
    } catch (err) {
      throw mapHttpError(err, name);
    }
  }
}
```

`mapHttpError` traduce `AxiosError`:

- `response.status === 404` → `PokemonNotFoundError`.
- `response.status >= 500` → `PokemonCatalogUnavailableError`.
- `!response` (sin respuesta, error de red, timeout) →
  `PokemonCatalogUnavailableError`.
- `AbortError` → `PokemonCatalogUnavailableError('PokeAPI request
aborted')`.

## 9. OpenAPI / Swagger

- Dependencia: `@nestjs/swagger` + CLI plugin.
- CLI plugin habilitado en `nest-cli.json`:
  ```json
  {
    "compilerOptions": {
      "plugins": ["@nestjs/swagger"]
    }
  }
  ```
- `main.ts` monta `SwaggerModule.setup('docs', app, document)` con
  `SwaggerModule.createDocument(app, config)`.
- `config` usa `DocumentBuilder` con:
  - `title: 'Pokemon API'`
  - `description: 'Servicio para crear y consultar Pokémon desde PokeAPI.'`
  - `version: '1.0.0'`
  - Tag `pokemon`.
- Decoradores presentes:
  - `CreatePokemonRequest` con `@PokemonNameField()` para
    `name`/`pokemon` y `oneOf` entre ambos campos.
  - `PokemonResponse` con `@ApiProperty` por campo.
  - `PokemonPostController.create` con `@ApiOperation`,
    `@ApiCreatedResponse`, `@ApiOkResponse`,
    `@ApiBadRequestResponse` y
    `@ApiServiceUnavailableResponse`.
  - `HealthController.check` con `@ApiOkResponse` y
    `@ApiServiceUnavailableResponse`.
- Spec servida en:
  - JSON: `GET /docs-json`
  - UI: `GET /docs`
- CI publica el spec como artefacto (`openapi.json`) tras el build.

## 10. Manejo de errores

- Los errores viven en
  `Contexts/Pokemon/application/errors/PokemonApplicationErrors.ts`:
  - `PokemonNotFoundError` (404 `POKEMON_NOT_FOUND`).
  - `PokemonCatalogUnavailableError` (502 `POKEAPI_UNAVAILABLE`).
  - `PokemonCatalogBadResponseError` (502 `POKEAPI_BAD_RESPONSE`).
  - `PokemonPersistenceUnavailableError` (503
    `DATABASE_UNAVAILABLE`).
- `InvalidPokemonNameApplicationError` (en `PokemonCreator.ts`)
  → 400 `INVALID_POKEMON_NAME`.
- `HttpErrorFilter` (en
  `Contexts/Shared/infrastructure/http/HttpErrorFilter.ts`)
  traduce a códigos HTTP y aplica mensajes públicos de la tabla
  `PUBLIC_ERROR_MESSAGES`. Los stack traces se omiten en
  producción. La respuesta de `Health` (Terminus) se respeta tal
  cual sin reescribirla.
- `nestjs-pino` registra `requestId`, `method`, `path`, `status`,
  `code`, `message` y (en no producción) el `stack` de la
  excepción.

### 10.1 `PokemonApplicationErrors.ts`

```ts
export class PokemonNotFoundError extends Error {
  readonly code = 'POKEMON_NOT_FOUND';
  constructor(name: string) {
    super(`Pokemon not found: ${name}`);
    this.name = 'PokemonNotFoundError';
  }
}

export class PokemonCatalogUnavailableError extends Error {
  readonly code = 'POKEAPI_UNAVAILABLE';
  constructor(message: string) {
    super(message);
    this.name = 'PokemonCatalogUnavailableError';
  }
}

export class PokemonCatalogBadResponseError extends Error {
  readonly code = 'POKEAPI_BAD_RESPONSE';
  constructor(message: string) {
    super(message);
    this.name = 'PokemonCatalogBadResponseError';
  }
}

export class PokemonPersistenceUnavailableError extends Error {
  readonly code = 'DATABASE_UNAVAILABLE';
  constructor(message: string) {
    super(message);
    this.name = 'PokemonPersistenceUnavailableError';
  }
}
```

### 10.2 `Contexts/Shared/infrastructure/http/HttpErrorFilter.ts` (resumen)

```ts
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    if (process.env['LOG_LEVEL'] === 'silent') {
      this.writeResponse(response, request, this.mapException(exception));
      return;
    }

    const mapping = this.mapException(exception);
    const errorBody: ErrorBody = {
      statusCode: mapping.status,
      code: mapping.code,
      message: mapping.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.error({
      requestId: request.id,
      method: request.method,
      path: request.url,
      status: mapping.status,
      code: mapping.code,
      message: exception instanceof Error ? exception.message : mapping.message,
      ...(process.env['NODE_ENV'] !== 'production' && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
    });

    response.status(mapping.status).json(errorBody);
  }

  private mapException(exception: unknown): ErrorMapping {
    if (exception instanceof InvalidPokemonNameApplicationError) {
      return { status: 400, code: 'INVALID_POKEMON_NAME', message: exception.message };
    }
    if (exception instanceof PokemonNotFoundError) {
      return { status: 404, code: 'POKEMON_NOT_FOUND', message: PUBLIC_ERROR_MESSAGES.notFound };
    }
    if (exception instanceof PokemonCatalogUnavailableError) {
      return {
        status: 502,
        code: 'POKEAPI_UNAVAILABLE',
        message: PUBLIC_ERROR_MESSAGES.catalogUnavailable,
      };
    }
    if (exception instanceof PokemonCatalogBadResponseError) {
      return {
        status: 502,
        code: 'POKEAPI_BAD_RESPONSE',
        message: PUBLIC_ERROR_MESSAGES.catalogBadResponse,
      };
    }
    if (exception instanceof PokemonPersistenceUnavailableError) {
      return {
        status: 503,
        code: 'DATABASE_UNAVAILABLE',
        message: PUBLIC_ERROR_MESSAGES.persistenceUnavailable,
      };
    }
    if (exception instanceof HttpException) {
      return mapHttpException(exception);
    }
    return { status: 500, code: 'INTERNAL_ERROR', message: PUBLIC_ERROR_MESSAGES.internal };
  }
}
```

### 10.3 Wiring (`main.ts`)

```ts
import { HttpErrorFilter } from './Contexts/Shared/infrastructure/http/HttpErrorFilter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.useGlobalPipes(new ValidationPipe({/* ... */}));
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
  // swagger
  await app.listen(Number(process.env['PORT'] ?? 3000));
}
```

## 11. Configuración (`config/env.schema.ts`)

```ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  POKEAPI_BASE_URL: z.string().url('POKEAPI_BASE_URL must be a valid URL'),
  POKEAPI_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type EnvVars = z.infer<typeof envSchema>;
```

> `PORT` es la única variable de puerto que el backend lee.
> `BACKEND_PORT` queda fuera del contrato; los puertos host se
> definen en `docker-compose.yml`.

## 12. Pruebas

### 12.1 Unitarias (`test/unit/`)

- `PokemonCreator.test.ts`: éxito (`created: true`), duplicado
  (`created: false`), `P2002` recovery, error 404, 502 timeout,
  502 payload inválido, 503 lectura, 503 escritura, nombre
  inválido.
- `PokeApiPokemonCatalog.test.ts`: respuesta válida, 404, 5xx,
  timeout, payload inválido, sin respuesta.
- `PokeApiPokemonSchema.test.ts`: payload válido, payloads con
  campos faltantes/extra.
- `PrismaPokemonRepository.test.ts`: `findByName`, `save` feliz,
  `save` con `P2002` recupera, `save` con error genérico lanza
  `PokemonPersistenceUnavailableError`.
- `PrismaPokemonMapper.test.ts`: dominio → Prisma → dominio.
- `ExactlyOneFieldConstraint.test.ts`: solo `name`, solo
  `pokemon`, ambos, ninguno, campos extra.
- `PokemonResponseMapper.test.ts`: entidad → DTO.
- `HttpErrorFilter.test.ts`: cada subclase de error se mapea al
  `httpStatus` y `code` correctos; la respuesta de Health no se
  reescribe.
- Value objects: `PokemonId`, `PokemonName`, `PokemonTypes` (en
  `src/Contexts/Pokemon/domain/model/*.test.ts`).

### 12.2 Integración (`test/integration/`)

- `PokemonHttp.test.ts` reemplaza los tokens `POKEMON_REPOSITORY` y
  `POKEMON_CATALOG` por dobles en memoria
  (`InMemoryPokemonRepository`, `FakePokemonCatalog`).
  - `POST /pokemon` con `{ name }` y catálogo vacío → `201`.
  - `POST /pokemon` con `{ pokemon }` y catálogo vacío → `201`.
  - `POST /pokemon` con `{ name }` y registro existente → `200`
    (sin invocar el catálogo).
  - Body vacío → `400`.
  - Ambos campos → `400`.
  - Campo extra `foo` → `400` (whitelist).
  - `name` con 51 caracteres → `400`.
  - `name` con mayúsculas → normaliza a minúsculas.
  - `name` con espacios al inicio/fin → normaliza con `trim`.
- `HealthHttp.test.ts`:
  - `GET /health` con `PrismaService` mockeado disponible → `200`
    y `details.database.status: "up"`.
  - `GET /health` con `PrismaService` mockeado que falla → `503` y
    `details.database.status: "down"`.

### 12.3 Jest

`apps/backend/jest.config.cjs`:

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testMatch: ['**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/config/**',
    '!src/**/PokemonResponse.ts',
    '!src/**/PokemonTokens.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: { lines: 85, statements: 85, functions: 85, branches: 80 },
  },
  clearMocks: true,
  setupFiles: ['<rootDir>/jest.setup.cjs'],
};
```

## 13. Scripts (`apps/backend/package.json`)

```jsonc
{
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "start:prod": "node dist/main.js",
    "lint": "eslint \"src/**/*.ts\" \"test/**/*.ts\"",
    "test": "node node_modules/jest/bin/jest.js --config jest.config.cjs",
    "test:watch": "node node_modules/jest/bin/jest.js --config jest.config.cjs --watch",
    "test:cov": "node node_modules/jest/bin/jest.js --config jest.config.cjs --coverage",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push --skip-generate",
  },
}
```

## 14. Dockerfile

Multi-stage sobre `node:24-alpine`:

1. **builder**: `corepack enable` → `pnpm install --frozen-lockfile
--filter @pokemon-amaris/backend...` →
   `pnpm --filter @pokemon-amaris/backend prisma:generate` →
   `pnpm --filter @pokemon-amaris/backend build`.
2. **runtime**: instala solo dependencias de producción con
   `pnpm install --frozen-lockfile --filter
@pokemon-amaris/backend... --prod` + `prisma:generate`. Crea el
   usuario no-root `app`. `EXPOSE 3000` y healthcheck
   `wget -qO- http://localhost:3000/health`.
3. **CMD**: el runtime ejecuta primero
   `node ./node_modules/prisma/build/index.js db push
--skip-generate --schema=./prisma/schema.prisma` y luego
   `node dist/main.js`. Esto elimina la necesidad de un servicio
   `db-init` separado; `docker-compose.yml` puede incluirlo como
   paso explícito adicional, pero es opcional.

## 15. Criterios de aceptación

- [ ] `POST /pokemon` acepta `{ name }` y `{ pokemon }` con
      normalización.
- [ ] Pokémon nuevo responde `201 Created`.
- [ ] Pokémon existente responde `200 OK` y **no** consulta
      PokeAPI.
- [ ] Concurrencia: ante dos `POST` simultáneos con el mismo
      `name`, `P2002` recovery deja una única fila y el segundo
      responde `200 OK` con el mismo `createdAt`.
- [ ] Campos persistidos: `id`, `name`, `height`, `weight`,
      `types`, `createdAt`, `updatedAt`.
- [ ] `prisma db push` inicializa el esquema (en `db-init` o en el
      `CMD` del Dockerfile runtime).
- [ ] Errores HTTP coherentes con el contrato (400/404/502/503/500)
      y esquema `{ statusCode, code, message, timestamp, path }`.
- [ ] `GET /health` retorna `200` si Terminus marca `database`
      como `up`.
- [ ] `GET /health` retorna `503` si Terminus marca `database`
      como `down`.
- [ ] Logs estructurados con `requestId` y `pino-pretty` fuera de
      producción.
- [ ] Cobertura total ≥ 85% (líneas, statements, funciones;
      branches ≥ 80%).
- [ ] Tests unitarios e integración pasan en CI (PostgreSQL **no**
      se usa en CI; todo mockeado).
- [ ] Lint sin errores.

## 16. Entregables

- `apps/backend` operativo con `pnpm dev`.
- `prisma/schema.prisma` consistente con la sección 4.
- `Dockerfile` multi-stage con `prisma db push` en runtime.
- Suite de pruebas con cobertura reportada.
