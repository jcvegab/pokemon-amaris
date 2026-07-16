import { describe, expect, it } from 'vitest';
import {
  pokemonApiResponseSchema,
  backendErrorResponseSchema,
} from '../../src/Contexts/Pokemon/infrastructure/api/PokemonApiSchema';

describe('pokemonApiResponseSchema', () => {
  it('parses a valid payload', () => {
    const result = pokemonApiResponseSchema.safeParse({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
      createdAt: '2026-07-16T12:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty types', () => {
    const result = pokemonApiResponseSchema.safeParse({
      id: 1,
      name: 'x',
      height: 1,
      weight: 1,
      types: [],
      createdAt: '2026-07-16T12:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative id', () => {
    const result = pokemonApiResponseSchema.safeParse({
      id: -1,
      name: 'x',
      height: 1,
      weight: 1,
      types: ['normal'],
      createdAt: '2026-07-16T12:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string types', () => {
    const result = pokemonApiResponseSchema.safeParse({
      id: 1,
      name: 'x',
      height: 1,
      weight: 1,
      types: [{ name: 'normal' }],
      createdAt: '2026-07-16T12:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing createdAt', () => {
    const result = pokemonApiResponseSchema.safeParse({
      id: 1,
      name: 'x',
      height: 1,
      weight: 1,
      types: ['normal'],
    });
    expect(result.success).toBe(false);
  });

  it('strips extra fields silently', () => {
    const result = pokemonApiResponseSchema.safeParse({
      id: 1,
      name: 'x',
      height: 1,
      weight: 1,
      types: ['normal'],
      createdAt: '2026-07-16T12:00:00.000Z',
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
