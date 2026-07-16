import { describe, expect, it } from 'vitest';
import { Pokemon } from '../../src/Contexts/Pokemon/domain/model/Pokemon';

const BASE_SNAPSHOT = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  types: ['electric'],
  createdAt: '2026-07-16T12:00:00.000Z',
};

describe('Pokemon', () => {
  it('builds a Pokemon from a snapshot', () => {
    const pokemon = Pokemon.fromSnapshot(BASE_SNAPSHOT);
    expect(pokemon.id).toBe(25);
    expect(pokemon.name.value).toBe('pikachu');
    expect(pokemon.height).toBe(4);
    expect(pokemon.weight).toBe(60);
    expect(pokemon.types).toEqual(['electric']);
    expect(pokemon.createdAt.toISOString()).toBe('2026-07-16T12:00:00.000Z');
  });

  it('rejects invalid createdAt timestamps', () => {
    expect(() => Pokemon.fromSnapshot({ ...BASE_SNAPSHOT, createdAt: 'not-a-date' })).toThrow();
  });

  it('freezes the types array', () => {
    const pokemon = Pokemon.fromSnapshot(BASE_SNAPSHOT);
    expect(() => (pokemon.types as string[]).push('hacked')).toThrow();
  });
});
