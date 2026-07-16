import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthModule } from '../../src/health/health.module';
import { PrismaService } from '../../src/Contexts/Shared/infrastructure/persistence/prisma/PrismaService';
import { HttpErrorFilter } from '../../src/Contexts/Shared/infrastructure/http/HttpErrorFilter';

describe('GET /health (integration)', () => {
  let app: INestApplication;
  let prisma: { $queryRaw: jest.Mock };

  beforeAll(() => {
    process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
    process.env['POKEAPI_BASE_URL'] = 'https://pokeapi.co/api/v2';
    process.env['LOG_LEVEL'] = 'silent';
    process.env['NODE_ENV'] = 'test';
  });

  async function buildApp(): Promise<INestApplication> {
    prisma = { $queryRaw: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, ignoreEnvVars: true }),
        HealthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    const testApp = moduleRef.createNestApplication();
    testApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    testApp.useGlobalFilters(new HttpErrorFilter());
    await testApp.init();
    return testApp;
  }

  afterEach(async () => {
    if (app) await app.close();
  });

  it('returns 200 with database.status=up when Prisma is healthy', async () => {
    app = await buildApp();
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info.database.status).toBe('up');
    expect(res.body.error).toEqual({});
    expect(res.body.details.database.status).toBe('up');
  });

  it('returns 503 with database.status=down when Prisma fails', async () => {
    app = await buildApp();
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
    const res = await request(app.getHttpServer()).get('/health').expect(503);
    expect(res.body.status).toBe('error');
    expect(res.body.error.database.status).toBe('down');
    expect(res.body.info).toEqual({});
  });
});
