import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PokemonForm } from '../../src/Contexts/Pokemon/ui/components/PokemonForm';

describe('PokemonForm', () => {
  it('submits the current input value', () => {
    const onSubmit = vi.fn();
    render(<PokemonForm onSubmit={onSubmit} loading={false} value="pikachu" onChange={() => {}} />);
    fireEvent.click(screen.getByTestId('pokemon-submit'));
    expect(onSubmit).toHaveBeenCalledWith('pikachu');
  });

  it('disables input and button while loading', () => {
    render(<PokemonForm onSubmit={() => {}} loading={true} value="pikachu" onChange={() => {}} />);
    expect(screen.getByTestId('pokemon-input')).toBeDisabled();
    expect(screen.getByTestId('pokemon-submit')).toBeDisabled();
  });

  it('shows a spinner label while loading', () => {
    render(<PokemonForm onSubmit={() => {}} loading={true} value="" onChange={() => {}} />);
    expect(screen.getByTestId('pokemon-submit')).toHaveTextContent('Buscando');
  });

  it('supports uncontrolled mode', () => {
    const onSubmit = vi.fn();
    render(<PokemonForm onSubmit={onSubmit} loading={false} />);
    fireEvent.change(screen.getByTestId('pokemon-input'), { target: { value: 'pichu' } });
    fireEvent.click(screen.getByTestId('pokemon-submit'));
    expect(onSubmit).toHaveBeenCalledWith('pichu');
  });
});
