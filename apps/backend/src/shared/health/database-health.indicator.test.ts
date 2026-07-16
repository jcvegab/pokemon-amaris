import { HealthIndicatorService } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database-health.indicator';

describe('DatabaseHealthIndicator', () => {
  function buildIndicator() {
    return new HealthIndicatorService();
  }

  it('returns up when $queryRaw resolves', async () => {
    const indicator = buildIndicator();
    const prisma = {
      $queryRaw: jest.fn<Promise<unknown[]>, []>().mockResolvedValue([{ '?column?': 1 }]),
    };
    const sut = new DatabaseHealthIndicator(indicator, prisma as unknown as never);
    const result = await sut.isHealthy('database');
    expect(result).toEqual({ database: { status: 'up' } });
  });

  it('returns down with error message when $queryRaw rejects', async () => {
    const indicator = buildIndicator();
    const prisma = {
      $queryRaw: jest
        .fn<Promise<unknown[]>, []>()
        .mockRejectedValue(new Error('connection refused')),
    };
    const sut = new DatabaseHealthIndicator(indicator, prisma as unknown as never);
    await expect(sut.isHealthy('database')).resolves.toEqual({
      database: { status: 'down', message: 'connection refused' },
    });
  });

  it('handles non-Error rejections in the down path', async () => {
    const indicator = buildIndicator();
    const prisma = {
      $queryRaw: jest.fn<Promise<unknown[]>, []>().mockRejectedValue('weird-failure'),
    };
    const sut = new DatabaseHealthIndicator(indicator, prisma as unknown as never);
    await expect(sut.isHealthy('database')).resolves.toEqual({
      database: { status: 'down', message: 'database check failed' },
    });
  });
});
