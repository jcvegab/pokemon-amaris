import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PokemonModule } from '../../src/Contexts/Pokemon/infrastructure/dependency-injection/PokemonModule';
import { PrismaService } from '../../src/Contexts/Shared/infrastructure/persistence/prisma/PrismaService';
import { HttpErrorFilter } from '../../src/Contexts/Shared/infrastructure/http/HttpErrorFilter';
import {
  POKEMON_CATALOG,
  POKEMON_REPOSITORY,
} from '../../src/Contexts/Pokemon/infrastructure/dependency-injection/PokemonTokens';
import { Pokemon } from '../../src/Contexts/Pokemon/domain/model/Pokemon';
import { PokemonName } from '../../src/Contexts/Pokemon/domain/model/PokemonName';
import { FakePokemonCatalog } from '../doubles/FakePokemonCatalog';
import { InMemoryPokemonRepository } from '../doubles/InMemoryPokemonRepository';

describe('POST /pokemon (integration)', () => {
  let app: INestApplication;
  let repo: InMemoryPokemonRepository;
  let catalog: FakePokemonCatalog;

  beforeAll(async () => {
    process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
    process.env['POKEAPI_BASE_URL'] = 'https://pokeapi.co/api/v2';
    process.env['POKEAPI_TIMEOUT_MS'] = '5000';
    process.env['LOG_LEVEL'] = 'silent';
    process.env['NODE_ENV'] = 'test';

    repo = new InMemoryPokemonRepository();
    catalog = new FakePokemonCatalog();

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), PokemonModule],
    })
      .overrideProvider(PrismaService)
      .useValue({} as never)
      .overrideProvider(POKEMON_REPOSITORY)
      .useValue(repo)
      .overrideProvider(POKEMON_CATALOG)
      .useValue(catalog)
      .compile();

    app = moduleRef.createNestApplication();
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
    app.useGlobalFilters(new HttpErrorFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    repo.records.clear();
    catalog.calls = [];
    catalog.response = {
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
    };
    catalog.shouldThrow = null;
  });

  it('returns 201 with the persisted Pokemon on first create', async () => {
    const res = await request(app.getHttpServer())
      .post('/pokemon')
      .send({ name: 'pikachu' })
      .expect(201);
    expect(res.body).toMatchObject({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
    });
    expect(typeof res.body.createdAt).toBe('string');
  });

  it('accepts { pokemon } as an alternative to { name }', async () => {
    const res = await request(app.getHttpServer())
      .post('/pokemon')
      .send({ pokemon: 'pikachu' })
      .expect(201);
    expect(res.body.name).toBe('pikachu');
  });

  it('returns 200 with the same createdAt when the Pokemon already exists', async () => {
    repo.records.set(
      'pikachu',
      Pokemon.rehydrate({
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        types: ['electric'],
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
      }),
    );
    const res = await request(app.getHttpServer())
      .post('/pokemon')
      .send({ name: 'pikachu' })
      .expect(200);
    expect(res.body.createdAt).toBe('2025-12-01T00:00:00.000Z');
    expect(catalog.calls).toHaveLength(0);
  });

  it('normalizes whitespace and case before processing', async () => {
    const res = await request(app.getHttpServer())
      .post('/pokemon')
      .send({ name: '  PIKACHU  ' })
      .expect(201);
    expect(res.body.name).toBe('pikachu');
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app.getHttpServer()).post('/pokemon').send({}).expect(400);
    expect(res.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    expect(typeof res.body.message).toBe('string');
  });

  it('returns 400 when both name and pokemon are present', async () => {
    const res = await request(app.getHttpServer())
      .post('/pokemon')
      .send({ name: 'pikachu', pokemon: 'pikachu' })
      .expect(400);
    expect(res.body).toMatchObject({ statusCode: 400 });
  });

  it('returns 400 when an extra field is provided (whitelist)', async () => {
    const res = await request(app.getHttpServer())
      .post('/pokemon')
      .send({ name: 'pikachu', foo: 'bar' })
      .expect(400);
    expect(res.body).toMatchObject({ statusCode: 400 });
  });

  it('returns 400 when name is longer than 50 characters', async () => {
    const res = await request(app.getHttpServer())
      .post('/pokemon')
      .send({ name: 'a'.repeat(51) })
      .expect(400);
    expect(res.body).toMatchObject({ statusCode: 400 });
  });

  it('returns 400 when name has invalid characters', async () => {
    const res = await request(app.getHttpServer())
      .post('/pokemon')
      .send({ name: 'pikachu!' })
      .expect(400);
    expect(res.body).toMatchObject({ statusCode: 400 });
  });

  it('returns 404 when catalog returns not found', async () => {
    const { PokemonNotFoundError } =
      await import('../../src/Contexts/Pokemon/application/errors/PokemonApplicationErrors');
    catalog.shouldThrow = new PokemonNotFoundError('missing');
    const res = await request(app.getHttpServer())
      .post('/pokemon')
      .send({ name: 'missing' })
      .expect(404);
    expect(res.body.code).toBe('POKEMON_NOT_FOUND');
  });

  it('returns 502 when catalog is unavailable', async () => {
    const { PokemonCatalogUnavailableError } =
      await import('../../src/Contexts/Pokemon/application/errors/PokemonApplicationErrors');
    catalog.shouldThrow = new PokemonCatalogUnavailableError('timeout');
    const res = await request(app.getHttpServer())
      .post('/pokemon')
      .send({ name: 'pikachu' })
      .expect(502);
    expect(res.body.code).toBe('POKEAPI_UNAVAILABLE');
  });

  it('returns 502 when catalog returns a bad payload', async () => {
    const { PokemonCatalogBadResponseError } =
      await import('../../src/Contexts/Pokemon/application/errors/PokemonApplicationErrors');
    catalog.shouldThrow = new PokemonCatalogBadResponseError('bad shape');
    const res = await request(app.getHttpServer())
      .post('/pokemon')
      .send({ name: 'pikachu' })
      .expect(502);
    expect(res.body.code).toBe('POKEAPI_BAD_RESPONSE');
  });

  it('returns 503 when the database read fails', async () => {
    const brokenRepo = {
      findByName: () => Promise.reject(new Error('connection refused')),
      save: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), PokemonModule],
    })
      .overrideProvider(PrismaService)
      .useValue({} as never)
      .overrideProvider(POKEMON_REPOSITORY)
      .useValue(brokenRepo)
      .overrideProvider(POKEMON_CATALOG)
      .useValue(catalog)
      .compile();
    const brokenApp = moduleRef.createNestApplication();
    brokenApp.useGlobalPipes(
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
    brokenApp.useGlobalFilters(new HttpErrorFilter());
    await brokenApp.init();
    try {
      const res = await request(brokenApp.getHttpServer())
        .post('/pokemon')
        .send({ name: 'pikachu' })
        .expect(503);
      expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
    } finally {
      await brokenApp.close();
    }
  });

  it('response body always has the uniform error shape on errors', async () => {
    const res = await request(app.getHttpServer()).post('/pokemon').send({}).expect(400);
    expect(res.body).toHaveProperty('statusCode');
    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('path');
    expect(typeof res.body.message).toBe('string');
  });

  it('verifies the PokemonName equality helper is consistent', () => {
    expect(new PokemonName('pikachu').equals(new PokemonName('Pikachu'))).toBe(true);
  });
});
