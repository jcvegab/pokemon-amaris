import { of, throwError } from 'rxjs';
import { PokeApiPokemonCatalog } from '../../src/Contexts/Pokemon/infrastructure/pokeapi/PokeApiPokemonCatalog';
import { PokemonName } from '../../src/Contexts/Pokemon/domain/model/PokemonName';
import {
  PokemonCatalogBadResponseError,
  PokemonCatalogUnavailableError,
  PokemonNotFoundError,
} from '../../src/Contexts/Pokemon/application/errors/PokemonApplicationErrors';

interface FakeHttp {
  get: jest.Mock;
}

function makeHttp(): FakeHttp {
  return { get: jest.fn() };
}

function axiosError(extra: Record<string, unknown>): Error & { isAxiosError: true } {
  return Object.assign(new Error('Request failed'), { isAxiosError: true, ...extra });
}

describe('PokeApiPokemonCatalog', () => {
  let http: FakeHttp;
  let catalog: PokeApiPokemonCatalog;

  beforeEach(() => {
    http = makeHttp();
    catalog = new PokeApiPokemonCatalog(http as unknown as never);
  });

  it('returns a snapshot on a 200 response', async () => {
    http.get.mockReturnValue(
      of({
        data: {
          id: 25,
          name: 'pikachu',
          height: 4,
          weight: 60,
          types: [{ slot: 1, type: { name: 'electric', url: 'x' } }],
        },
      }),
    );
    const result = await catalog.search(new PokemonName('pikachu'));
    expect(result).toEqual({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
    });
  });

  it('throws PokemonCatalogBadResponseError when payload fails schema', async () => {
    http.get.mockReturnValue(of({ data: { id: 'not-a-number' } }));
    await expect(catalog.search(new PokemonName('pikachu'))).rejects.toBeInstanceOf(
      PokemonCatalogBadResponseError,
    );
  });

  it('logs invalid payloads when logging is enabled', async () => {
    const previousLogLevel = process.env['LOG_LEVEL'];
    process.env['LOG_LEVEL'] = 'info';
    http.get.mockReturnValue(of({ data: { id: 'not-a-number' } }));

    try {
      await expect(catalog.search(new PokemonName('pikachu'))).rejects.toBeInstanceOf(
        PokemonCatalogBadResponseError,
      );
    } finally {
      if (previousLogLevel === undefined) {
        delete process.env['LOG_LEVEL'];
      } else {
        process.env['LOG_LEVEL'] = previousLogLevel;
      }
    }
  });

  it('throws PokemonCatalogBadResponseError when types is empty', async () => {
    http.get.mockReturnValue(of({ data: { id: 1, name: 'x', height: 1, weight: 1, types: [] } }));
    await expect(catalog.search(new PokemonName('x'))).rejects.toBeInstanceOf(
      PokemonCatalogBadResponseError,
    );
  });

  it('throws PokemonNotFoundError on axios 404', async () => {
    http.get.mockReturnValue(throwError(() => axiosError({ response: { status: 404 } })));
    await expect(catalog.search(new PokemonName('missing'))).rejects.toBeInstanceOf(
      PokemonNotFoundError,
    );
  });

  it('throws PokemonCatalogUnavailableError on axios 5xx', async () => {
    http.get.mockReturnValue(throwError(() => axiosError({ response: { status: 503 } })));
    await expect(catalog.search(new PokemonName('pikachu'))).rejects.toBeInstanceOf(
      PokemonCatalogUnavailableError,
    );
  });

  it('throws PokemonCatalogUnavailableError on network error', async () => {
    http.get.mockReturnValue(throwError(() => axiosError({ code: 'ECONNREFUSED' })));
    await expect(catalog.search(new PokemonName('pikachu'))).rejects.toBeInstanceOf(
      PokemonCatalogUnavailableError,
    );
  });

  it('throws PokemonCatalogUnavailableError on AbortError', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    http.get.mockReturnValue(throwError(() => abortErr));
    await expect(catalog.search(new PokemonName('pikachu'))).rejects.toBeInstanceOf(
      PokemonCatalogUnavailableError,
    );
  });

  it('throws PokemonCatalogUnavailableError on generic Error', async () => {
    http.get.mockReturnValue(throwError(() => new Error('something exploded')));
    await expect(catalog.search(new PokemonName('pikachu'))).rejects.toBeInstanceOf(
      PokemonCatalogUnavailableError,
    );
  });
});
