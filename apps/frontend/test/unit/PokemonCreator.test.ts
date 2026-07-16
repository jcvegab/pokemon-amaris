import { describe, expect, it, beforeEach, vi } from 'vitest';
import { PokemonCreator } from '../../src/Contexts/Pokemon/application/create/PokemonCreator';
import {
  PokemonError,
  POKEMON_ERROR_CODES,
} from '../../src/Contexts/Pokemon/domain/model/PokemonError';
import { InMemoryPokemonRepository } from '../doubles/InMemoryPokemonRepository';

describe('PokemonCreator', () => {
  let repo: InMemoryPokemonRepository;
  let creator: PokemonCreator;

  beforeEach(() => {
    repo = new InMemoryPokemonRepository();
    creator = new PokemonCreator(repo);
  });

  it('creates a new pokemon and returns created=true', async () => {
    const result = await creator.execute({ rawName: 'pikachu' });
    expect(result.created).toBe(true);
    expect(result.pokemon.name.value).toBe('pikachu');
  });

  it('throws PokemonError(INVALID_INPUT) for empty rawName', async () => {
    await expect(creator.execute({ rawName: '   ' })).rejects.toBeInstanceOf(PokemonError);
    await expect(creator.execute({ rawName: '' })).rejects.toMatchObject({
      code: POKEMON_ERROR_CODES.invalidInput,
    });
  });

  it('throws PokemonError(INVALID_INPUT) for invalid characters', async () => {
    await expect(creator.execute({ rawName: 'pikachu!' })).rejects.toMatchObject({
      code: POKEMON_ERROR_CODES.invalidInput,
    });
  });

  it('propagates repository errors as PokemonError', async () => {
    repo.shouldFailCreate = new PokemonError(POKEMON_ERROR_CODES.databaseUnavailable, 'db down');
    await expect(creator.execute({ rawName: 'pikachu' })).rejects.toBeInstanceOf(PokemonError);
  });

  it('wraps unknown repository errors', async () => {
    const broken = {
      create: vi.fn(() => Promise.reject(new Error('boom'))),
    } as unknown as Parameters<typeof PokemonCreator>[0];
    const sut = new PokemonCreator(broken);
    await expect(sut.execute({ rawName: 'pikachu' })).rejects.toBeInstanceOf(PokemonError);
  });
});
