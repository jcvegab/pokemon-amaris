import { describe, expect, it } from 'vitest';
import { mapHttpErrorToPokemonError } from '../../src/Contexts/Pokemon/infrastructure/api/PokemonApiErrorMapper';
import { POKEMON_ERROR_CODES } from '../../src/Contexts/Pokemon/domain/model/PokemonError';

describe('mapHttpErrorToPokemonError', () => {
  it('passes through the known backend code INVALID_POKEMON_NAME on 400', () => {
    const err = mapHttpErrorToPokemonError(400, {
      statusCode: 400,
      code: 'INVALID_POKEMON_NAME',
      message: 'name must match pattern',
    });
    expect(err.code).toBe(POKEMON_ERROR_CODES.invalidInput);
    expect(err.message).toBe('name must match pattern');
  });

  it('falls back to VALIDATION_ERROR on 400 with unknown backend code', () => {
    const err = mapHttpErrorToPokemonError(400, { statusCode: 400, code: 'X', message: 'bad' });
    expect(err.code).toBe(POKEMON_ERROR_CODES.validation);
  });

  it('uses the backend code when it is a known code (POKEMON_NOT_FOUND)', () => {
    const err = mapHttpErrorToPokemonError(404, {
      statusCode: 404,
      code: 'POKEMON_NOT_FOUND',
      message: 'no',
    });
    expect(err.code).toBe(POKEMON_ERROR_CODES.notFound);
    expect(err.message).toBe('no');
  });

  it('falls back to POKEMON_NOT_FOUND on 404 with unknown backend code', () => {
    const err = mapHttpErrorToPokemonError(404, {
      statusCode: 404,
      code: 'UNKNOWN',
      message: 'no',
    });
    expect(err.code).toBe(POKEMON_ERROR_CODES.notFound);
    expect(err.message).toBe('no');
  });

  it('falls back to catalog unavailable on 502 with unknown code', () => {
    const err = mapHttpErrorToPokemonError(502, {
      statusCode: 502,
      code: 'POKEAPI_UNAVAILABLE',
      message: 'no',
    });
    expect(err.code).toBe(POKEMON_ERROR_CODES.catalogUnavailable);
    expect(err.message).toBe('no');
  });

  it('falls back to database unavailable on 503 with known code', () => {
    const err = mapHttpErrorToPokemonError(503, {
      statusCode: 503,
      code: 'DATABASE_UNAVAILABLE',
      message: 'no',
    });
    expect(err.code).toBe(POKEMON_ERROR_CODES.databaseUnavailable);
    expect(err.message).toBe('no');
  });

  it('uses fallback message when no body is provided', () => {
    const err = mapHttpErrorToPokemonError(502, null);
    expect(err.code).toBe(POKEMON_ERROR_CODES.catalogUnavailable);
    expect(err.message).toBe('No pudimos consultar la PokéAPI. Intenta de nuevo.');
  });

  it('returns unexpected for unknown status', () => {
    const err = mapHttpErrorToPokemonError(418, null);
    expect(err.code).toBe(POKEMON_ERROR_CODES.unexpected);
  });

  it('handles non-conforming body gracefully', () => {
    const err = mapHttpErrorToPokemonError(500, { totally: 'wrong' });
    expect(err.code).toBe(POKEMON_ERROR_CODES.unexpected);
  });
});
