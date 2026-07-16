import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatHeight,
  formatPokedexNumber,
  formatWeight,
  toPokemonViewModel,
} from '../../src/Contexts/Pokemon/ui/presenters/PokemonPresenter';
import { Pokemon } from '../../src/Contexts/Pokemon/domain/model/Pokemon';

describe('PokemonPresenter', () => {
  it('formats height with units', () => {
    expect(formatHeight(4)).toBe('0.4 m');
  });

  it('formats weight with units', () => {
    expect(formatWeight(60)).toBe('6.0 kg');
  });

  it('pads the pokedex number', () => {
    expect(formatPokedexNumber(25)).toBe('#025');
    expect(formatPokedexNumber(1500)).toBe('#1500');
    expect(formatPokedexNumber(-1)).toBe('#???');
  });

  it('returns the original string for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('builds a view model from a Pokemon', () => {
    const pokemon = Pokemon.fromSnapshot({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
      createdAt: '2026-07-16T12:00:00.000Z',
    });
    const viewModel = toPokemonViewModel(pokemon);
    expect(viewModel.displayName).toBe('Pikachu');
    expect(viewModel.pokedexNumber).toBe('#025');
    expect(viewModel.height).toBe('0.4 m');
    expect(viewModel.weight).toBe('6.0 kg');
    expect(viewModel.types).toEqual(['electric']);
  });
});
