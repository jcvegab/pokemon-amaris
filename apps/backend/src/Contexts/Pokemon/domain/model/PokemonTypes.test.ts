import { PokemonTypes, InvalidPokemonTypesError } from './PokemonTypes';

describe('PokemonTypes', () => {
  it('accepts a valid types array', () => {
    const types = new PokemonTypes(['electric']);
    expect(types.value).toEqual(['electric']);
  });

  it('preserves the order of types', () => {
    const types = new PokemonTypes(['grass', 'poison']);
    expect(types.value).toEqual(['grass', 'poison']);
  });

  it('rejects empty arrays', () => {
    expect(() => new PokemonTypes([])).toThrow(InvalidPokemonTypesError);
  });

  it('rejects duplicate entries', () => {
    expect(() => new PokemonTypes(['fire', 'fire'])).toThrow(InvalidPokemonTypesError);
  });

  it('rejects non-array input', () => {
    expect(() => new PokemonTypes('fire')).toThrow(InvalidPokemonTypesError);
    expect(() => new PokemonTypes(null)).toThrow(InvalidPokemonTypesError);
    expect(() => new PokemonTypes({})).toThrow(InvalidPokemonTypesError);
  });

  it('treats duplicates with different casing as duplicates', () => {
    expect(() => new PokemonTypes(['Fire', 'fire'])).toThrow(InvalidPokemonTypesError);
  });

  it('rejects empty string entries', () => {
    expect(() => new PokemonTypes([''])).toThrow(InvalidPokemonTypesError);
  });

  it('returns a defensive copy via toStringArray', () => {
    const types = new PokemonTypes(['fire']);
    const arr = types.toStringArray();
    arr.push('hacked');
    expect(types.value).toEqual(['fire']);
  });

  it('freezes the value array', () => {
    const types = new PokemonTypes(['fire']);
    expect(() => (types.value as string[]).push('hacked')).toThrow();
  });
});
