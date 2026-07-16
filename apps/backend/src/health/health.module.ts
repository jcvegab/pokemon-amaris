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
