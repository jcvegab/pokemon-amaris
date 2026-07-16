import { Pokemon, InvalidPokemonMeasurementError } from './Pokemon';

describe('Pokemon entity', () => {
  describe('create', () => {
    it('builds a Pokemon from raw input and validates it', () => {
      const pokemon = Pokemon.create({
        id: 25,
        name: 'PIKACHU',
        height: 4,
        weight: 60,
        types: ['electric'],
      });
      expect(pokemon.id.value).toBe(25);
      expect(pokemon.name.value).toBe('pikachu');
      expect(pokemon.height).toBe(4);
      expect(pokemon.weight).toBe(60);
      expect(pokemon.types.toStringArray()).toEqual(['electric']);
      expect(pokemon.createdAt).toBeInstanceOf(Date);
    });

    it('rejects invalid ids', () => {
      expect(() =>
        Pokemon.create({
          id: 0,
          name: 'pikachu',
          height: 4,
          weight: 60,
          types: ['electric'],
        }),
      ).toThrow();
    });

    it('rejects invalid names', () => {
      expect(() =>
        Pokemon.create({
          id: 25,
          name: '',
          height: 4,
          weight: 60,
          types: ['electric'],
        }),
      ).toThrow();
    });

    it('rejects negative height', () => {
      expect(() =>
        Pokemon.create({
          id: 25,
          name: 'pikachu',
          height: -1,
          weight: 60,
          types: ['electric'],
        }),
      ).toThrow(InvalidPokemonMeasurementError);
    });

    it('rejects fractional weight', () => {
      expect(() =>
        Pokemon.create({
          id: 25,
          name: 'pikachu',
          height: 4,
          weight: 1.5,
          types: ['electric'],
        }),
      ).toThrow(InvalidPokemonMeasurementError);
    });
  });

  describe('rehydrate', () => {
    it('builds a Pokemon from a persistence record', () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      const pokemon = Pokemon.rehydrate({
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        types: ['electric'],
        createdAt,
      });
      expect(pokemon.id.value).toBe(25);
      expect(pokemon.name.value).toBe('pikachu');
      expect(pokemon.types.toStringArray()).toEqual(['electric']);
      expect(pokemon.createdAt).toBe(createdAt);
    });
  });
});
