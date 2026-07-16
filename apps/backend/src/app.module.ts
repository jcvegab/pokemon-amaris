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
    LoggerModule.forRoot({
      pinoHttp: {
        level: (process.env['LOG_LEVEL'] ?? 'info') as
          'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace',
        autoLogging: true,
        genReqId: (req, res) => {
          const headerId = req.headers['x-request-id'];
          const id =
            typeof headerId === 'string' && headerId.length > 0
              ? headerId
              : Math.random().toString(36).slice(2, 12);
          res.setHeader('x-request-id', id);
          return id;
        },
        ...(process.env['NODE_ENV'] === 'production'
          ? {}
          : { transport: { target: 'pino-pretty', options: { singleLine: true } } }),
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
          censor: '[redacted]',
        },
      },
    }),
    PrismaModule,
    HealthModule,
    PokemonModule,
  ],
})
export class AppModule {}
