import { describe, expect, it } from 'vitest';
import {
  PokemonName,
  POKEMON_NAME_MAX_LENGTH,
  POKEMON_NAME_PATTERN,
  InvalidPokemonNameError,
} from '../../src/Contexts/Pokemon/domain/model/PokemonName';

describe('PokemonName', () => {
  describe('normalization', () => {
    it('trims whitespace', () => {
      expect(new PokemonName('  pikachu  ').value).toBe('pikachu');
    });
    it('lowercases input', () => {
      expect(new PokemonName('PIKACHU').value).toBe('pikachu');
    });
    it('trims and lowercases together', () => {
      expect(new PokemonName('  PIKACHU  ').value).toBe('pikachu');
    });
    it('preserves inner dashes and digits', () => {
      expect(new PokemonName('mr-mime').value).toBe('mr-mime');
      expect(new PokemonName('porygon2').value).toBe('porygon2');
    });
  });

  describe('validation', () => {
    it('rejects empty input', () => {
      expect(() => new PokemonName('')).toThrow(InvalidPokemonNameError);
      expect(() => new PokemonName('   ')).toThrow(InvalidPokemonNameError);
    });
    it(`rejects names longer than ${POKEMON_NAME_MAX_LENGTH} chars`, () => {
      const tooLong = 'a'.repeat(POKEMON_NAME_MAX_LENGTH + 1);
      expect(() => new PokemonName(tooLong)).toThrow(InvalidPokemonNameError);
    });
    it('accepts the maximum length', () => {
      const max = 'a'.repeat(POKEMON_NAME_MAX_LENGTH);
      expect(new PokemonName(max).value).toBe(max);
    });
    it('rejects names with invalid characters', () => {
      expect(() => new PokemonName('pikachu!')).toThrow(InvalidPokemonNameError);
      expect(() => new PokemonName('pikachu electric')).toThrow(InvalidPokemonNameError);
      expect(() => new PokemonName('pikachu_25')).toThrow(InvalidPokemonNameError);
      expect(() => new PokemonName('café')).toThrow(InvalidPokemonNameError);
    });
  });

  it('equals compares by value', () => {
    expect(new PokemonName('pikachu').equals(new PokemonName('Pikachu'))).toBe(true);
    expect(new PokemonName('pikachu').equals(new PokemonName('charmander'))).toBe(false);
  });

  it('exposes the contract pattern', () => {
    expect(POKEMON_NAME_PATTERN.test('pikachu')).toBe(true);
    expect(POKEMON_NAME_PATTERN.test('Pikachu')).toBe(false);
  });
});
