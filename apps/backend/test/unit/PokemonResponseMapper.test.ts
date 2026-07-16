import {
  pokemonToResponse,
  toResponse,
} from '../../src/Contexts/Pokemon/infrastructure/http/PokemonResponseMapper';
import { Pokemon } from '../../src/Contexts/Pokemon/domain/model/Pokemon';

describe('pokemonToResponse', () => {
  it('serializes a Pokemon to the response shape', () => {
    const createdAt = new Date('2026-07-16T12:00:00.000Z');
    const pokemon = Pokemon.rehydrate({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
      createdAt,
    });
    expect(pokemonToResponse({ pokemon, created: true })).toEqual({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
      createdAt: '2026-07-16T12:00:00.000Z',
    });
  });

  it('serializes via toResponse', () => {
    const pokemon = Pokemon.create({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
    });
    expect(toResponse(pokemon).name).toBe('pikachu');
  });
});
