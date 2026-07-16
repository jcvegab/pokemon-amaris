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
