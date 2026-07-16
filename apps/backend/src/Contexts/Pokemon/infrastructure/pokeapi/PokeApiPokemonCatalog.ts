import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError, isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { type PokemonCatalog, type PokemonSnapshot } from '../../application/ports/PokemonCatalog';
import {
  PokemonCatalogBadResponseError,
  PokemonCatalogUnavailableError,
  PokemonNotFoundError,
} from '../../application/errors/PokemonApplicationErrors';
import { type PokemonName } from '../../domain/model/PokemonName';
import { PokeApiPokemonMapper } from './PokeApiPokemonMapper';
import { pokeApiPokemonSchema } from './PokeApiPokemonSchema';

@Injectable()
export class PokeApiPokemonCatalog implements PokemonCatalog {
  private readonly logger = new Logger(PokeApiPokemonCatalog.name);

  constructor(private readonly http: HttpService) {}

  async search(name: PokemonName): Promise<PokemonSnapshot> {
    const response = await this.fetchResponse(name);
    const parsed = pokeApiPokemonSchema.safeParse(response.data);
    if (!parsed.success) {
      if (process.env['LOG_LEVEL'] !== 'silent') {
        this.logger.warn({
          msg: 'PokeAPI response failed schema',
          name: name.value,
          issues: parsed.error.issues,
        });
      }
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

function mapHttpError(err: unknown, name: PokemonName): Error {
  if (isAxiosError(err)) {
    if (err.response?.status === 404) {
      return new PokemonNotFoundError(name.value);
    }
    if (err.response && err.response.status >= 500) {
      return new PokemonCatalogUnavailableError(`PokeAPI request failed: ${err.response.status}`);
    }
    if (!err.response) {
      return new PokemonCatalogUnavailableError(
        `PokeAPI request failed: ${err.code ?? err.message}`,
      );
    }
  }
  if (err instanceof AxiosError) {
    return new PokemonCatalogUnavailableError(`PokeAPI request failed: ${err.message}`);
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return new PokemonCatalogUnavailableError('PokeAPI request aborted');
  }
  return new PokemonCatalogUnavailableError(
    err instanceof Error ? err.message : 'PokeAPI request failed',
  );
}
