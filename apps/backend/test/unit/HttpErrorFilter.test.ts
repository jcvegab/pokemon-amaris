import { HttpErrorFilter } from '../../src/Contexts/Shared/infrastructure/http/HttpErrorFilter';
import { InvalidPokemonNameApplicationError } from '../../src/Contexts/Pokemon/application/create/PokemonCreator';
import {
  PokemonCatalogBadResponseError,
  PokemonCatalogUnavailableError,
  PokemonNotFoundError,
  PokemonPersistenceUnavailableError,
} from '../../src/Contexts/Pokemon/application/errors/PokemonApplicationErrors';
import { HttpException } from '@nestjs/common';

function makeHost(response: { status: jest.Mock; json: jest.Mock }) {
  const req = { method: 'POST', url: '/pokemon' };
  return {
    switchToHttp: () => ({
      getResponse: <T = unknown>() => response as unknown as T,
      getRequest: <T = unknown>() => req as unknown as T,
    }),
  } as unknown as Parameters<HttpErrorFilter['catch']>[1];
}

describe('HttpErrorFilter', () => {
  let filter: HttpErrorFilter;
  let response: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    process.env['LOG_LEVEL'] = 'silent';
    filter = new HttpErrorFilter();
    response = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  afterEach(() => {
    delete process.env['LOG_LEVEL'];
  });

  it('maps InvalidPokemonNameApplicationError to 400 with the original message', () => {
    filter.catch(new InvalidPokemonNameApplicationError('bad name'), makeHost(response));
    expect(response.status).toHaveBeenCalledWith(400);
    const body = response.json.mock.calls[0]![0];
    expect(body.code).toBe('INVALID_POKEMON_NAME');
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('bad name');
    expect(body.path).toBe('/pokemon');
    expect(typeof body.timestamp).toBe('string');
  });

  it('maps PokemonNotFoundError to 404 with a public message', () => {
    filter.catch(new PokemonNotFoundError('missing'), makeHost(response));
    expect(response.status).toHaveBeenCalledWith(404);
    const body = response.json.mock.calls[0]![0];
    expect(body.code).toBe('POKEMON_NOT_FOUND');
    expect(body.message).toBe('Pokemon not found');
  });

  it('maps PokemonCatalogUnavailableError to 502 with a public message', () => {
    filter.catch(new PokemonCatalogUnavailableError('timeout'), makeHost(response));
    expect(response.status).toHaveBeenCalledWith(502);
    const body = response.json.mock.calls[0]![0];
    expect(body.code).toBe('POKEAPI_UNAVAILABLE');
    expect(body.message).toBe('Pokemon catalog unavailable');
  });

  it('maps PokemonCatalogBadResponseError to 502 with a public message', () => {
    filter.catch(new PokemonCatalogBadResponseError('bad shape'), makeHost(response));
    expect(response.status).toHaveBeenCalledWith(502);
    const body = response.json.mock.calls[0]![0];
    expect(body.code).toBe('POKEAPI_BAD_RESPONSE');
    expect(body.message).toBe('Pokemon catalog returned an invalid response');
  });

  it('maps PokemonPersistenceUnavailableError to 503 with a public message', () => {
    filter.catch(new PokemonPersistenceUnavailableError('db down'), makeHost(response));
    expect(response.status).toHaveBeenCalledWith(503);
    const body = response.json.mock.calls[0]![0];
    expect(body.code).toBe('DATABASE_UNAVAILABLE');
    expect(body.message).toBe('Database unavailable');
  });

  it('maps unknown errors to 500 INTERNAL_ERROR', () => {
    filter.catch(new Error('boom'), makeHost(response));
    expect(response.status).toHaveBeenCalledWith(500);
    const body = response.json.mock.calls[0]![0];
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Unexpected error');
  });

  it('handles HttpException with string response', () => {
    filter.catch(new HttpException('Forbidden', 403), makeHost(response));
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json.mock.calls[0]![0].message).toBe('Forbidden');
  });

  it('handles HttpException with object response (validation)', () => {
    const ex = new HttpException(
      { message: ['name must match pattern'], error: 'Bad Request' },
      400,
    );
    filter.catch(ex, makeHost(response));
    expect(response.status).toHaveBeenCalledWith(400);
    const body = response.json.mock.calls[0]![0];
    expect(body.message).toBe('name must match pattern');
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('handles HttpException with object response (non-uppercase error)', () => {
    const ex = new HttpException({ message: 'some message', error: 'lowercase error' }, 422);
    filter.catch(ex, makeHost(response));
    const body = response.json.mock.calls[0]![0];
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('handles HttpException with array body that has no string items', () => {
    const ex = new HttpException({ message: [42], error: 'Bad Request' }, 400);
    filter.catch(ex, makeHost(response));
    const body = response.json.mock.calls[0]![0];
    expect(body.message).toBe('Validation failed');
  });
});
