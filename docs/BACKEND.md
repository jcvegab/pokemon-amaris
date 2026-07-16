# PLAN — BACKEND

## 1. Objetivo

Implementar el servicio en NestJS 11 que consulta la PokeAPI, persiste información de Pokémon en PostgreSQL 17 mediante Prisma, y expone los endpoints `POST /pokemon` y `GET /health` con validación, manejo de errores y pruebas.

## 2. Decisiones técnicas

| Aspecto            | Decisión                                                            |
| ------------------ | ------------------------------------------------------------------- |
| Framework          | NestJS 11 (última estable compatible)                               |
| Lenguaje           | TypeScript 6.x (extiende `tsconfig.base.json`)                      |
| Runtime            | Node 24 LTS                                                         |
| Base de datos      | PostgreSQL 17                                                       |
| ORM                | Prisma 5.x (última estable)                                         |
| Inicialización DB  | `prisma db push` (sin migraciones, según `DEFINITION.md`)           |
| Cliente HTTP       | `@nestjs/axios` (`HttpService` con `axios` subyacente)              |
| API docs           | `@nestjs/swagger` con CLI plugin, UI en `/docs`                     |
| Health checks      | `@nestjs/terminus` con indicador propio de base de datos            |
| Validación         | `class-validator` + `class-transformer` con `ValidationPipe` global |
| Logger             | `nestjs-pino`                                                       |
| Config             | `@nestjs/config` con validación `zod`                               |
| Tests              | Jest + `ts-jest` (Prisma y PokeAPI mockeados)                       |
| Cobertura objetivo | > 85%                                                               |
| Arquitectura       | Hexagonal sin CQRS                                                  |

## 3. Layout de `apps/backend`

```
apps/backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   └── env.schema.ts
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── domain.error.ts
│   │   │   └── http-error.filter.ts
│   │   ├── health/
│   │   │   └── database-health.indicator.ts
│   │   └── prisma/
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   ├── pokemon/
│   │   ├── pokemon.module.ts
│   │   ├── domain/
│   │   │   ├── entities/pokemon.entity.ts
│   │   │   ├── value-objects/pokemon-id.vo.ts
│   │   │   ├── value-objects/pokemon-name.vo.ts
│   │   │   ├── value-objects/pokemon-types.vo.ts
│   │   │   ├── repositories/pokemon.repository.ts
│   │   │   └── services/pokeapi.service.ts
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── create-pokemon.dto.ts
│   │   │   │   └── validators/
│   │   │   │       ├── exactly-one-field.constraint.ts
│   │   │   │       └── pokemon-name-field.decorator.ts
│   │   │   ├── usecases/create-pokemon.usecase.ts
│   │   │   └── mappers/pokemon.mapper.ts
│   │   ├── infrastructure/
│   │   │   ├── pokeapi/
│   │   │   │   ├── pokeapi-http.module.ts
│   │   │   │   └── pokeapi-http.adapter.ts
│   │   │   ├── repositories/prisma-pokemon.repository.ts
│   │   │   └── persistence/pokemon.mapper.ts
│   │   └── interfaces/
│   │       └── http/
│   │           ├── pokemon.controller.ts
│   │           └── responses/pokemon.response.ts
│   └── health/
│       ├── health.module.ts
│       └── health.controller.ts
├── test/
│   ├── unit/
│   └── integration/
├── .env.example
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── package.json
├── jest.config.ts
└── README.md
```

## 4. Modelo de datos (Prisma)

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
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
- `name`: nombre normalizado en minúsculas.
- `height` / `weight`: valores crudos de PokeAPI.
- `types`: arreglo de strings con los tipos del Pokémon.
- **Convención**: `camelCase` en el modelo Prisma, `snake_case` en columnas PostgreSQL vía `@map` (TS-friendly, DB-idiomático).
- `@@map("pokemons")`: tabla en plural (`pokemons`).
- Columnas resultantes: `id`, `name`, `height`, `weight`, `types` (`text[]`), `created_at`, `updated_at`.

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

- Normalización: `trim()` + `toLowerCase()`.
- Solo uno de los dos campos; si faltan ambos o ambos llegan, `400 Bad Request`.
- Validación de longitud (1..50), patrón `^[a-z0-9-]+$`.

### 5.1.1 DTO estricto

```ts
import { Validate } from 'class-validator';
import { ExactlyOneFieldConstraint } from './validators/exactly-one-field.constraint';
import { PokemonNameField } from './validators/pokemon-name-field.decorator';

export class CreatePokemonDto {
  @PokemonNameField('name')
  name?: string;

  @PokemonNameField('pokemon')
  pokemon?: string;

  @Validate(ExactlyOneFieldConstraint, ['name', 'pokemon'])
  private readonly _oneOf?: never;
}
```

### 5.1.2 Decorador de campo Pokémon

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

### 5.1.4 `ValidationPipe` global (estricto)

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
- `forbidUnknownValues`: falla si llegan objetos sin prototipo controlado.
- `transform`: aplica `Type`/`Transform` declarados en el DTO.

### 5.2 Respuesta exitosa

- `201 Created`: cuando el Pokémon no existía en la base de datos y se acaba de persistir.
- `200 OK`: cuando el Pokémon ya existía en la base de datos y se devuelve el registro persistido. **No** se vuelve a consultar PokeAPI para registros existentes.

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

> **Manejo de concurrencia:** la operación de escritura usa `upsert` (Prisma) por `name` para evitar inserciones duplicadas cuando dos requests concurrentes intentan crear el mismo Pokémon. Si la fila ya existe por `name`, se trata como `200 OK`.

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

### 5.3 Errores

| Código | Cuándo                                                                     |
| ------ | -------------------------------------------------------------------------- |
| 400    | Body inválido (sin nombre, ambos, formato incorrecto, campo extra)         |
| 404    | PokeAPI no encuentra el Pokémon                                            |
| 502    | PokeAPI no responde, responde con `5xx`, o responde con formato inesperado |
| 503    | No se puede escribir/leer en PostgreSQL                                    |
| 500    | Error inesperado                                                           |

**Esquema uniforme de error** (devuelto por `HttpErrorFilter`):

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
- `code`: código de error estable y uppercase (`INVALID_POKEMON_NAME`, `POKEMON_NOT_FOUND`, `POKEAPI_UNAVAILABLE`, `POKEAPI_BAD_RESPONSE`, `DATABASE_UNAVAILABLE`, `INTERNAL_ERROR`, `VALIDATION_ERROR`).
- `message`: siempre `string` en la respuesta pública. Los detalles de validación interna se mantienen solo en logs.

## 6. Endpoint `GET /health`

Endpoint liviano con `@nestjs/terminus` para validar que el servidor responde y que PostgreSQL está accesible.

### 6.1 Request

No recibe body ni parámetros.

```http
GET /health
```

### 6.2 Validaciones

- **Server**: si NestJS puede ejecutar el handler, Terminus marca el servicio como disponible.
- **Database**: `DatabaseHealthIndicator` expone el check semántico `database` y oculta que internamente usa Prisma.
- No consulta PokeAPI; health solo valida dependencias necesarias para servir datos persistidos.

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

### 6.5 `health/health.controller.ts` (borrador)

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
  @ApiOkResponse({ description: 'Servidor y base de datos disponibles' })
  @ApiServiceUnavailableResponse({ description: 'Base de datos no disponible' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.database.isHealthy('database')]);
  }
}
```

### 6.6 `shared/health/database-health.indicator.ts`

```ts
import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

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
import { DatabaseHealthIndicator } from '../shared/health/database-health.indicator';
import { PrismaModule } from '../shared/prisma/prisma.module';
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
import { HealthModule } from './health/health.module';
import { PokemonModule } from './pokemon/pokemon.module';

@Module({
  imports: [HealthModule, PokemonModule],
})
export class AppModule {}
```

## 7. Flujo de negocio

1. `PokemonController` recibe el DTO.
2. `CreatePokemonUseCase`:
   1. Normaliza el nombre (`trim()` + `toLowerCase()`).
   2. Busca en `PokemonRepository` por `name`.
   3. Si existe, retorna el registro persistido con `200 OK` y un flag `created: false`.
   4. Si no existe, consulta `PokeApiService` por `name`.
   5. Si PokeAPI devuelve 404, lanza `PokemonNotFoundError` (404).
   6. Si PokeAPI no responde o responde 5xx, lanza `PokeApiUnavailableError` (502).
   7. Si la respuesta no pasa la validación `zod`, lanza `PokeApiBadResponseError` (502).
   8. Mapea la respuesta validada a entidad de dominio.
   9. Persiste con `PokemonRepository.upsertByName` (idempotente por `name`).
   10. Si la DB falla, lanza `DatabaseUnavailableError` (503).
   11. Retorna la entidad con flag `created: true` para que el controlador emita `201 Created`.

## 8. Adaptador PokeAPI

- URL: `GET {POKEAPI_BASE_URL}/pokemon/{name}`.
- Módulo: `PokeapiHttpModule` (propio del bounded context) en `pokemon/infrastructure/pokeapi/pokeapi-http.module.ts` con `baseURL: POKEAPI_BASE_URL` y `timeout: POKEAPI_TIMEOUT_MS`.
- Inyección: `PokeapiHttpAdapter` recibe `HttpService` por constructor y usa `firstValueFrom(httpService.get(...))`.
- Cancelación: `HttpService` soporta `signal` de `AbortController` además del `timeout` configurado en el módulo.
- Validación de respuesta con `zod` para evitar `datos faltantes` o `formato inesperado`.
- Mapeo de campos a entidad de dominio (`id`, `name`, `height`, `weight`, `types`).

### 8.1 `pokemon/infrastructure/pokeapi/pokeapi-http.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule as NestHttpModule } from '@nestjs/axios';
import { PokeapiHttpAdapter } from './pokeapi-http.adapter';

@Module({
  imports: [
    NestHttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.get<string>('POKEAPI_BASE_URL'),
        timeout: config.get<number>('POKEAPI_TIMEOUT_MS'),
        headers: { 'Content-Type': 'application/json' },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 300,
      }),
    }),
  ],
  providers: [PokeapiHttpAdapter],
  exports: [PokeapiHttpAdapter],
})
export class PokeapiHttpModule {}
```

### 8.2 `pokemon/pokemon.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { PokeapiHttpModule } from './infrastructure/pokeapi/pokeapi-http.module';
import { PokemonController } from './interfaces/http/pokemon.controller';
import { CreatePokemonUseCase } from './application/usecases/create-pokemon.usecase';
import { PrismaPokemonRepository } from './infrastructure/repositories/prisma-pokemon.repository';

@Module({
  imports: [ConfigModule, PrismaModule, PokeapiHttpModule],
  controllers: [PokemonController],
  providers: [
    CreatePokemonUseCase,
    { provide: 'PokeapiPort', useClass: PokeapiHttpAdapter },
    { provide: 'PokemonRepository', useClass: PrismaPokemonRepository },
  ],
})
export class PokemonModule {}
```

### 8.3 Mapeo de respuesta PokeAPI (`pokeapi-pokemon.schema.ts`)

Mapeo TypeScript + Zod del endpoint `GET https://pokeapi.co/api/v2/pokemon/<name>`. Solo valida los campos que el dominio persiste (`id`, `name`, `height`, `weight`, `types`); el resto de la respuesta de PokeAPI se ignora por stripping implícito de `z.object()`.

```ts
import { z } from 'zod';

const namedApiResourceSchema = z.object({
  name: z.string().min(1),
  url: z.url(),
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
- `name`: string no vacío, igual al nombre consultado.
- `height` / `weight`: enteros no negativos (decímetros / hectogramos en PokeAPI).
- `types`: arreglo no vacío de `{ slot, type: { name, url } }`; se proyecta a `string[]` con `type.name`.
- Cualquier campo adicional de PokeAPI (`sprites`, `moves`, `abilities`, `cries`, etc.) es descartado por Zod sin error.

### 8.4 `pokeapi-http.adapter.ts`

```ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PokeapiPort } from '../domain/services/pokeapi.service';
import { PokemonName } from '../domain/value-objects/pokemon-name.vo';
import { pokeApiPokemonSchema } from './pokeapi-pokemon.schema';

@Injectable()
export class PokeapiHttpAdapter implements PokeapiPort {
  constructor(private readonly http: HttpService) {}

  async fetchByName(name: PokemonName, signal?: AbortSignal) {
    const { data } = await firstValueFrom(this.http.get(`/pokemon/${name.value}`, { signal }));
    const parsed = pokeApiPokemonSchema.safeParse(data);
    if (!parsed.success) throw new Error('PokeApiBadResponse');
    return {
      id: parsed.data.id,
      name: parsed.data.name,
      height: parsed.data.height,
      weight: parsed.data.weight,
      types: parsed.data.types.map((t) => t.type.name),
    };
  }
}
```

## 9. OpenAPI / Swagger

- Dependencia: `@nestjs/swagger` + CLI plugin.
- CLI plugin habilitado en `nest-cli.json`:
  ```json
  {
    "collection": "@nestjs/schematics",
    "compilerOptions": {
      "plugins": ["@nestjs/swagger"]
    }
  }
  ```
- `main.ts` monta `SwaggerModule.setup('docs', app, document)` con `SwaggerModule.createDocument(app, config)`.
- `config` usa `DocumentBuilder` con:
  - `title: 'Pokemon API'`
  - `description: 'Servicio para crear y consultar Pokémon desde PokeAPI.'`
  - `version: '1.0.0'`
  - Tag `pokemon`.
- Decoradores:
  - `CreatePokemonDto` con `@PokemonNameField()` para `name`/`pokemon` y `oneOf` entre ambos campos.
  - `PokemonResponse` con `@ApiProperty` por campo.
  - `PokemonController.create` con `@ApiOperation`, `@ApiResponse({ status: 201 })`, `@ApiResponse({ status: 200, description: 'Ya existía' })`, `@ApiResponse({ status: 400 })`, `@ApiResponse({ status: 404 })`, `@ApiResponse({ status: 502 })`, `@ApiResponse({ status: 503 })`.
  - `HealthController.check` con `@ApiOkResponse({ status: 200 })` y `@ApiServiceUnavailableResponse({ status: 503 })`.
- Spec servida en:
  - JSON: `GET /docs-json`
  - UI: `GET /docs`
- CI publica el spec como artefacto (`openapi.json`) tras el build.

## 10. Manejo de errores

- `DomainError` base; subclases: `InvalidPokemonNameError`, `PokemonNotFoundError`, `PokeApiUnavailableError`, `PokeApiBadResponseError`, `DatabaseUnavailableError`.
- `HttpErrorFilter` traduce a códigos HTTP y oculta stack traces en producción.
- `Pino` registra `requestId`, `pokemonName`, `durationMs`, `outcome`.

### 10.1 `shared/errors/domain.error.ts`

```ts
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidPokemonNameError extends DomainError {
  readonly code = 'INVALID_POKEMON_NAME';
  readonly httpStatus = 400;
}
export class PokemonNotFoundError extends DomainError {
  readonly code = 'POKEMON_NOT_FOUND';
  readonly httpStatus = 404;
}
export class PokeApiUnavailableError extends DomainError {
  readonly code = 'POKEAPI_UNAVAILABLE';
  readonly httpStatus = 502;
}
export class PokeApiBadResponseError extends DomainError {
  readonly code = 'POKEAPI_BAD_RESPONSE';
  readonly httpStatus = 502;
}
export class DatabaseUnavailableError extends DomainError {
  readonly code = 'DATABASE_UNAVAILABLE';
  readonly httpStatus = 503;
}
```

### 10.2 `shared/errors/http-error.filter.ts`

```ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from './domain.error';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Unexpected error';

    if (exception instanceof DomainError) {
      status = exception.httpStatus;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      message = typeof r === 'string' ? r : ((r as any).message ?? message);
      code = (r as any)?.error ?? code;
    }

    this.logger.error({
      requestId: (req as any).id,
      method: req.method,
      path: req.url,
      status,
      code,
      message,
      stack: process.env.NODE_ENV === 'production' ? undefined : (exception as Error)?.stack,
    });

    res.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
```

### 10.3 Wiring (`main.ts`)

```ts
import { HttpErrorFilter } from './shared/errors/http-error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useGlobalFilters(new HttpErrorFilter());
  // ... resto
}
```

Alternativa: registrar el filter como `APP_FILTER` en `AppModule` para que el DI reciba `Pino` y `ConfigService` por constructor.

## 11. Configuración (`env.schema.ts`)

```ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  POKEAPI_BASE_URL: z.string().url(),
  POKEAPI_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});
```

> **Nota:** la variable `PORT` es la única que el backend lee. `BACKEND_PORT` queda fuera del contrato; los puertos host se definen en `docker-compose.yml`.

## 12. Pruebas

### 12.1 Unitarias (`test/unit/`)

- `create-pokemon.usecase.spec.ts`: éxito (201), duplicado (200), errores de PokeAPI (502, 404), errores de DB (503).
- `pokeapi-http.adapter.spec.ts`: parseo, timeout, payload inválido, 404.
- `prisma-pokemon.repository.spec.ts`: con `PrismaClient` mockeado (incluye `upsertByName`).
- Value objects: validación de `pokemonName`, `id`, `pokemonTypes`.
- `exactly-one-field.constraint.spec.ts`: solo `name`, solo `pokemon`, ambos, ninguno, campos extra.
- `health.controller.spec.ts`: DB disponible retorna `200` con indicadores `up`; error Prisma retorna `503` con `database.status: "down"`.
- `http-error.filter.spec.ts`: mapeo de cada subclase de `DomainError` a su `httpStatus` y `code`.

### 12.2 Integración (`test/integration/`)

- `pokemon.controller.spec.ts`: usa `Test.createTestingModule` con `PinoHttp`, `PrismaService` y `PokeapiPort` mockeados. **No** se conecta a PostgreSQL real en CI.
  - `POST /pokemon` con `{ name }` válido y DB vacía → 201.
  - `POST /pokemon` con `{ pokemon }` válido y DB vacía → 201.
  - `POST /pokemon` con `{ name }` y registro existente (mock) → 200.
  - Body vacío → 400.
  - Ambos campos → 400.
  - Campo extra `foo` → 400 (whitelist).
  - `name` con 51 caracteres → 400.
  - `name` con mayúsculas → normaliza a minúsculas.
  - `name` con espacios al inicio/fin → normaliza con trim.
- `health.controller.spec.ts`:
  - `GET /health` con DB mockeada disponible → 200 y `status: "ok"`, `details.database.status: "up"`.
  - `GET /health` con DB mockeada no disponible → 503 y `status: "error"`, `details.database.status: "down"`.

### 12.3 Jest

```ts
// jest.config.ts (resumen)
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts'],
  coverageThreshold: { global: { lines: 85, statements: 85, functions: 85, branches: 80 } },
};
```

## 13. Scripts (`apps/backend/package.json`)

```jsonc
{
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "lint": "eslint \"src/**/*.ts\" \"test/**/*.ts\"",
    "test": "jest",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push --skip-generate",
  },
}
```

## 14. Dockerfile

Multi-stage:

1. **build**: `node:24-alpine` + `pnpm install --frozen-lockfile` + `pnpm prisma generate` + `pnpm build`.
2. **runtime**: `node:24-alpine` con usuario no-root, expone `3000`, `CMD ["node", "dist/main.js"]`.
3. Espera activa a la DB mediante `dockerize` o script de retry.

## 15. Criterios de aceptación

- [ ] `POST /pokemon` acepta `{ name }` y `{ pokemon }` con normalización.
- [ ] Pokémon nuevo responde `201 Created`.
- [ ] Pokémon existente responde `200 OK` y **no** consulta PokeAPI.
- [ ] `upsert` evita duplicados bajo concurrencia.
- [ ] Campos persistidos: `id`, `name`, `height`, `weight`, `types`.
- [ ] `prisma db push` inicializa el esquema en Docker.
- [ ] Errores HTTP coherentes con el contrato (400/404/502/503/500) y esquema `{ statusCode, code, message, timestamp, path }`.
- [ ] `GET /health` retorna `200` si Terminus marca `database` como `up`.
- [ ] `GET /health` retorna `503` si Terminus marca `database` como `down`.
- [ ] Logs estructurados con `requestId`.
- [ ] Cobertura total > 85% (líneas, statements, funciones; branches ≥ 80%).
- [ ] Tests unitarios e integración pasan en CI (PostgreSQL **no** se usa en CI; todo mockeado).
- [ ] Lint sin errores.

## 16. Entregables

- `apps/backend` operativo con `pnpm dev`.
- `prisma/schema.prisma` consistente con la sección 4.
- `Dockerfile` multi-stage.
- Suite de pruebas con cobertura reportada.
