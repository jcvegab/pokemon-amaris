import { PokemonId, InvalidPokemonIdError } from './PokemonId';

describe('PokemonId', () => {
  it('accepts positive integers', () => {
    expect(new PokemonId(1).value).toBe(1);
    expect(new PokemonId(25).value).toBe(25);
    expect(new PokemonId(1025).value).toBe(1025);
  });

  it('rejects zero', () => {
    expect(() => new PokemonId(0)).toThrow(InvalidPokemonIdError);
  });

  it('rejects negative integers', () => {
    expect(() => new PokemonId(-1)).toThrow(InvalidPokemonIdError);
  });

  it('rejects non-integer numbers', () => {
    expect(() => new PokemonId(1.5)).toThrow(InvalidPokemonIdError);
  });

  it('rejects NaN and Infinity', () => {
    expect(() => new PokemonId(Number.NaN)).toThrow(InvalidPokemonIdError);
    expect(() => new PokemonId(Number.POSITIVE_INFINITY)).toThrow(InvalidPokemonIdError);
  });

  it('equals compares by value', () => {
    expect(new PokemonId(25).equals(new PokemonId(25))).toBe(true);
    expect(new PokemonId(25).equals(new PokemonId(26))).toBe(false);
  });
});
