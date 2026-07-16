import { describe, expect, it, beforeEach, vi } from 'vitest';
import { PokemonCreator } from '../../src/Contexts/Pokemon/application/create/PokemonCreator';
import { Pokemon } from '../../src/Contexts/Pokemon/domain/model/Pokemon';
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

  it('returns existing pokemon without re-creating', async () => {
    const existing = Pokemon.fromSnapshot({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    repo.records.set('pikachu', existing);
    const result = await creator.execute({ rawName: 'PIKACHU' });
    expect(result.created).toBe(false);
    expect(result.pokemon.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
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
    repo.shouldFailFind = new PokemonError(POKEMON_ERROR_CODES.databaseUnavailable, 'db down');
    await expect(creator.execute({ rawName: 'pikachu' })).rejects.toBeInstanceOf(PokemonError);
  });

  it('wraps unknown repository errors', async () => {
    const broken = {
      findByName: () => Promise.reject(new Error('boom')),
      create: vi.fn(),
    } as unknown as Parameters<typeof PokemonCreator>[0];
    const sut = new PokemonCreator(broken);
    await expect(sut.execute({ rawName: 'pikachu' })).rejects.toBeInstanceOf(PokemonError);
  });
});
