import { describe, expect, it, beforeEach } from 'vitest';
import { ApiPokemonRepository } from '../../src/Contexts/Pokemon/infrastructure/api/ApiPokemonRepository';
import { PokemonName } from '../../src/Contexts/Pokemon/domain/model/PokemonName';
import { POKEMON_ERROR_CODES } from '../../src/Contexts/Pokemon/domain/model/PokemonError';

interface FetchCall {
  url: string;
  init: RequestInit;
}

function makeFetch(handler: (call: FetchCall) => Response | Promise<Response>): {
  fetch: typeof fetch;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    return handler({ url: String(input), init });
  }) as unknown as typeof fetch;
  return { fetch: fetchImpl, calls };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiPokemonRepository', () => {
  let fetchStub: ReturnType<typeof makeFetch>;
  let repo: ApiPokemonRepository;

  beforeEach(() => {
    fetchStub = makeFetch(() => new Response('', { status: 500 }));
    repo = new ApiPokemonRepository({
      baseUrl: '/api',
      timeoutMs: 1000,
      fetchImpl: fetchStub.fetch,
    });
  });

  it('POSTs { name } and returns created=true on 201', async () => {
    fetchStub = makeFetch(() =>
      jsonResponse(201, {
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        types: [{ slot: 1, type: { name: 'electric', url: 'x' } }],
        createdAt: '2026-07-16T12:00:00.000Z',
      }),
    );
    repo = new ApiPokemonRepository({
      baseUrl: '/api',
      timeoutMs: 1000,
      fetchImpl: fetchStub.fetch,
    });

    const result = await repo.create(new PokemonName('pikachu'));
    expect(result.created).toBe(true);
    expect(result.pokemon.id).toBe(25);
    expect(fetchStub.calls[0]!.url).toBe('/api/pokemon');
    expect(fetchStub.calls[0]!.init.method).toBe('POST');
  });

  it('returns created=false on 200', async () => {
    fetchStub = makeFetch(() =>
      jsonResponse(200, {
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        types: [{ slot: 1, type: { name: 'electric', url: 'x' } }],
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    repo = new ApiPokemonRepository({
      baseUrl: '/api',
      timeoutMs: 1000,
      fetchImpl: fetchStub.fetch,
    });

    const result = await repo.create(new PokemonName('pikachu'));
    expect(result.created).toBe(false);
  });

  it('maps backend error code to PokemonError', async () => {
    fetchStub = makeFetch(() =>
      jsonResponse(404, {
        statusCode: 404,
        code: 'POKEMON_NOT_FOUND',
        message: 'Pokemon not found: missing',
        timestamp: '2026-01-01T00:00:00.000Z',
        path: '/pokemon',
      }),
    );
    repo = new ApiPokemonRepository({
      baseUrl: '/api',
      timeoutMs: 1000,
      fetchImpl: fetchStub.fetch,
    });

    await expect(repo.create(new PokemonName('missing'))).rejects.toMatchObject({
      code: POKEMON_ERROR_CODES.notFound,
      statusCode: 404,
    });
  });

  it('throws PokemonError for invalid success payload', async () => {
    fetchStub = makeFetch(() => jsonResponse(201, { id: 'bad' }));
    repo = new ApiPokemonRepository({
      baseUrl: '/api',
      timeoutMs: 1000,
      fetchImpl: fetchStub.fetch,
    });

    await expect(repo.create(new PokemonName('pikachu'))).rejects.toMatchObject({
      code: POKEMON_ERROR_CODES.unexpected,
    });
  });

  it('throws PokemonError when response name differs from requested name', async () => {
    fetchStub = makeFetch(() =>
      jsonResponse(201, {
        id: 26,
        name: 'raichu',
        height: 4,
        weight: 60,
        types: [{ slot: 1, type: { name: 'electric', url: 'x' } }],
        createdAt: '2026-07-16T12:00:00.000Z',
      }),
    );
    repo = new ApiPokemonRepository({
      baseUrl: '/api',
      timeoutMs: 1000,
      fetchImpl: fetchStub.fetch,
    });

    await expect(repo.create(new PokemonName('pikachu'))).rejects.toMatchObject({
      code: POKEMON_ERROR_CODES.notFound,
    });
  });

  it('throws NetworkError on fetch rejection', async () => {
    fetchStub = makeFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    repo = new ApiPokemonRepository({
      baseUrl: '/api',
      timeoutMs: 1000,
      fetchImpl: fetchStub.fetch,
    });

    await expect(repo.create(new PokemonName('pikachu'))).rejects.toMatchObject({
      code: POKEMON_ERROR_CODES.network,
    });
  });

  it('strips trailing slash from baseUrl', async () => {
    fetchStub = makeFetch(() =>
      jsonResponse(201, {
        id: 1,
        name: 'pikachu',
        height: 1,
        weight: 1,
        types: [{ slot: 1, type: { name: 'electric', url: 'x' } }],
        createdAt: '2026-07-16T12:00:00.000Z',
      }),
    );
    repo = new ApiPokemonRepository({
      baseUrl: '/api/',
      timeoutMs: 1000,
      fetchImpl: fetchStub.fetch,
    });
    await repo.create(new PokemonName('pikachu'));
    expect(fetchStub.calls[0]!.url).toBe('/api/pokemon');
  });
});
