import { env } from '../../../Shared/infrastructure/config/env';
import { type Pokemon } from '../../domain/model/Pokemon';
import { PokemonError, POKEMON_ERROR_CODES } from '../../domain/model/PokemonError';
import { type PokemonName } from '../../domain/model/PokemonName';
import type {
  PokemonRepository,
  PokemonRepositoryCreateOutcome,
} from '../../application/ports/PokemonRepository';
import {
  combineSignals,
  HttpError,
  isAbortErrorLike,
  NetworkError,
  RequestAbortedError,
} from '../../../Shared/infrastructure/http/httpErrors';
import { pokemonApiResponseSchema, type PokemonApiResponse } from './PokemonApiSchema';
import { PokemonApiMapper } from './PokemonApiMapper';
import { mapHttpErrorToPokemonError } from './PokemonApiErrorMapper';

export interface ApiPokemonRepositoryOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class ApiPokemonRepository implements PokemonRepository {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiPokemonRepositoryOptions = {}) {
    this.baseUrl = (options.baseUrl ?? env.VITE_API_BASE_URL).replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? env.VITE_API_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async create(name: PokemonName): Promise<PokemonRepositoryCreateOutcome> {
    const result = await this.request<unknown>('POST', '/pokemon', { name: name.value });
    if (result.status === 201) {
      return { pokemon: this.parsePokemonResponse(result.body, name), created: true };
    }
    if (result.status === 200) {
      return { pokemon: this.parsePokemonResponse(result.body, name), created: false };
    }
    throw mapHttpErrorToPokemonError(result.status, result.body);
  }

  private async request<T>(
    method: 'POST',
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: T }> {
    const { signal, cancel, didTimeout } = combineSignals(undefined, this.timeoutMs);
    const init: RequestInit = { method, signal };
    if (body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, init);
      const parsed = await parseResponseBody(response);
      if (!response.ok) {
        throw mapHttpErrorToPokemonError(response.status, parsed);
      }
      return { status: response.status, body: parsed as T };
    } catch (err) {
      if (err instanceof PokemonError) {
        throw err;
      }
      if (isAbortErrorLike(err)) {
        if (didTimeout()) {
          throw new NetworkError('Sin conexión. Revisa tu red.', err);
        }
        throw new RequestAbortedError(err);
      }
      if (err instanceof HttpError) {
        throw new PokemonError(POKEMON_ERROR_CODES.unexpected, err.message, err.statusCode);
      }
      throw new NetworkError('Sin conexión. Revisa tu red.', err);
    } finally {
      cancel();
    }
  }

  private parsePokemonResponse(body: unknown, expectedName: PokemonName): Pokemon {
    const parsed = pokemonApiResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new PokemonError(POKEMON_ERROR_CODES.unexpected, 'Respuesta inesperada del servidor.');
    }
    const dto: PokemonApiResponse = parsed.data;
    const snapshot = PokemonApiMapper.toSnapshot(dto);
    if (snapshot.name !== expectedName.value) {
      throw new PokemonError(
        POKEMON_ERROR_CODES.notFound,
        'No encontramos ese Pokémon. Verifica la escritura.',
        404,
      );
    }
    return PokemonApiMapper.snapshotToPokemon(snapshot);
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}
