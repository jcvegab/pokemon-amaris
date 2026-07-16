import { describe, expect, it } from 'vitest';
import {
  PokemonError,
  POKEMON_ERROR_CODES,
} from '../../src/Contexts/Pokemon/domain/model/PokemonError';

describe('PokemonError', () => {
  it('exposes a known code', () => {
    const err = new PokemonError(POKEMON_ERROR_CODES.notFound, 'No encontrado', 404);
    expect(err.code).toBe('POKEMON_NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('No encontrado');
  });

  it('omits statusCode when not provided', () => {
    const err = new PokemonError(POKEMON_ERROR_CODES.network, 'Sin conexión');
    expect(err.statusCode).toBeUndefined();
  });
});
