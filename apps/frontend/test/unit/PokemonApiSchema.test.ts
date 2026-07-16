import { describe, expect, it } from 'vitest';
import {
  pokeApiPokemonDtoSchema,
  backendErrorResponseSchema,
} from '../../src/Contexts/Pokemon/infrastructure/api/PokemonApiSchema';

describe('pokeApiPokemonDtoSchema', () => {
  it('parses a valid payload', () => {
    const result = pokeApiPokemonDtoSchema.safeParse({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: [{ slot: 1, type: { name: 'electric', url: 'x' } }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty types', () => {
    const result = pokeApiPokemonDtoSchema.safeParse({
      id: 1,
      name: 'x',
      height: 1,
      weight: 1,
      types: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative id', () => {
    const result = pokeApiPokemonDtoSchema.safeParse({
      id: -1,
      name: 'x',
      height: 1,
      weight: 1,
      types: [{ slot: 1, type: { name: 'a', url: 'x' } }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name on type', () => {
    const result = pokeApiPokemonDtoSchema.safeParse({
      id: 1,
      name: 'x',
      height: 1,
      weight: 1,
      types: [{ slot: 1, type: { url: 'x' } }],
    });
    expect(result.success).toBe(false);
  });

  it('strips extra fields silently', () => {
    const result = pokeApiPokemonDtoSchema.safeParse({
      id: 1,
      name: 'x',
      height: 1,
      weight: 1,
      types: [{ slot: 1, type: { name: 'a', url: 'x' } }],
      sprites: { whatever: true },
    });
    expect(result.success).toBe(true);
  });
});

describe('backendErrorResponseSchema', () => {
  it('parses a valid error body', () => {
    const result = backendErrorResponseSchema.safeParse({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'name must match',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing code', () => {
    const result = backendErrorResponseSchema.safeParse({
      statusCode: 400,
      message: 'bad',
    });
    expect(result.success).toBe(false);
  });
});
