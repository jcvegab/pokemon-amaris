import { pokeApiPokemonSchema } from '../../src/Contexts/Pokemon/infrastructure/pokeapi/PokeApiPokemonSchema';

describe('pokeApiPokemonSchema', () => {
  it('parses a valid PokeAPI payload', () => {
    const result = pokeApiPokemonSchema.safeParse({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: [{ slot: 1, type: { name: 'electric', url: 'x' } }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative id', () => {
    const result = pokeApiPokemonSchema.safeParse({
      id: -1,
      name: 'x',
      height: 1,
      weight: 1,
      types: [{ slot: 1, type: { name: 'a', url: 'x' } }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer id', () => {
    const result = pokeApiPokemonSchema.safeParse({
      id: 1.5,
      name: 'x',
      height: 1,
      weight: 1,
      types: [{ slot: 1, type: { name: 'a', url: 'x' } }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty types array', () => {
    const result = pokeApiPokemonSchema.safeParse({
      id: 1,
      name: 'x',
      height: 1,
      weight: 1,
      types: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing type.name', () => {
    const result = pokeApiPokemonSchema.safeParse({
      id: 1,
      name: 'x',
      height: 1,
      weight: 1,
      types: [{ slot: 1, type: { url: 'x' } }],
    });
    expect(result.success).toBe(false);
  });

  it('strips extra fields silently', () => {
    const result = pokeApiPokemonSchema.safeParse({
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
