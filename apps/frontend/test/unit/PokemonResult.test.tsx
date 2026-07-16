import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PokemonResult } from '../../src/Contexts/Pokemon/ui/components/PokemonResult';
import { toPokemonViewModel } from '../../src/Contexts/Pokemon/ui/presenters/PokemonPresenter';
import { Pokemon } from '../../src/Contexts/Pokemon/domain/model/Pokemon';

describe('PokemonResult', () => {
  const viewModel = toPokemonViewModel(
    Pokemon.fromSnapshot({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
      createdAt: '2026-07-16T12:00:00.000Z',
    }),
  );

  it('renders the result card', () => {
    render(<PokemonResult pokemon={viewModel} />);
    expect(screen.getByTestId('pokemon-result')).toBeInTheDocument();
  });

  it('formats the pokedex number', () => {
    render(<PokemonResult pokemon={viewModel} />);
    expect(screen.getByTestId('pokedex-number')).toHaveTextContent('#025');
  });

  it('renders types as badges', () => {
    render(<PokemonResult pokemon={viewModel} />);
    expect(screen.getAllByTestId('pokemon-badge')).toHaveLength(1);
  });

  it('renders the height with units', () => {
    render(<PokemonResult pokemon={viewModel} />);
    expect(screen.getByTestId('pokemon-height')).toHaveTextContent('0.4 m');
  });
});
