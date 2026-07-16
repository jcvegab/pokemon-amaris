import { PrismaPokemonMapper } from '../../src/Contexts/Pokemon/infrastructure/persistence/prisma/PrismaPokemonMapper';
import { Pokemon } from '../../src/Contexts/Pokemon/domain/model/Pokemon';

describe('PrismaPokemonMapper', () => {
  it('maps a Prisma record into a domain Pokemon', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const pokemon = PrismaPokemonMapper.toDomain({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
      createdAt,
    });
    expect(pokemon).toBeInstanceOf(Pokemon);
    expect(pokemon.id.value).toBe(25);
    expect(pokemon.name.value).toBe('pikachu');
    expect(pokemon.types.toStringArray()).toEqual(['electric']);
    expect(pokemon.createdAt).toBe(createdAt);
  });

  it('maps a domain Pokemon to a Prisma create input', () => {
    const pokemon = Pokemon.create({
      id: 25,
      name: 'Pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
    });
    expect(PrismaPokemonMapper.toCreateInput(pokemon)).toEqual({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
    });
  });
});
