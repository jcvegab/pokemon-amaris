import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomePage } from '../../src/Contexts/Pokemon/ui/pages/HomePage';
import { PokemonCreator } from '../../src/Contexts/Pokemon/application/create/PokemonCreator';
import { InMemoryPokemonRepository } from '../doubles/InMemoryPokemonRepository';
import {
  PokemonError,
  POKEMON_ERROR_CODES,
} from '../../src/Contexts/Pokemon/domain/model/PokemonError';

describe('HomePage integration', () => {
  let repo: InMemoryPokemonRepository;
  let creator: PokemonCreator;

  beforeEach(() => {
    repo = new InMemoryPokemonRepository();
    creator = new PokemonCreator(repo);
  });

  it('renders the page', () => {
    render(<HomePage creator={creator} />);
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('blocks empty submissions with a local message', () => {
    render(<HomePage creator={creator} />);
    fireEvent.click(screen.getByTestId('pokemon-submit'));
    expect(screen.getByTestId('input-error')).toHaveTextContent('Ingresa un nombre');
  });

  it('shows success and the result on a successful submit', async () => {
    render(<HomePage creator={creator} />);
    fireEvent.change(screen.getByTestId('pokemon-input'), { target: { value: 'pikachu' } });
    fireEvent.click(screen.getByTestId('pokemon-submit'));
    const banner = await screen.findByTestId('status-banner');
    expect(banner.dataset['status']).toBe('success');
    expect(await screen.findByTestId('pokemon-result')).toBeInTheDocument();
  });

  it('shows an error banner on repository failure', async () => {
    repo.shouldFailFind = new PokemonError(POKEMON_ERROR_CODES.notFound, 'No encontrado', 404);
    render(<HomePage creator={creator} />);
    fireEvent.change(screen.getByTestId('pokemon-input'), { target: { value: 'missing' } });
    fireEvent.click(screen.getByTestId('pokemon-submit'));
    const banner = await screen.findByTestId('status-banner');
    expect(banner.dataset['status']).toBe('error');
  });

  it('resets input and state when clicking reset', async () => {
    render(<HomePage creator={creator} />);
    fireEvent.change(screen.getByTestId('pokemon-input'), { target: { value: 'pikachu' } });
    fireEvent.click(screen.getByTestId('pokemon-submit'));
    await screen.findByTestId('pokemon-result');
    const reset = screen.getByTestId('reset-button');
    fireEvent.click(reset);
    expect((screen.getByTestId('pokemon-input') as HTMLInputElement).value).toBe('');
  });
});
