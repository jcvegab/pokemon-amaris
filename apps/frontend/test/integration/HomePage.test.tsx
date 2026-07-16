import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, screen, fireEvent, render, waitFor } from '@testing-library/react';
import { useCreatePokemon } from '../../src/Contexts/Pokemon/ui/hooks/useCreatePokemon';
import { PokemonCreator } from '../../src/Contexts/Pokemon/application/create/PokemonCreator';
import { InMemoryPokemonRepository } from '../doubles/InMemoryPokemonRepository';
import {
  PokemonError,
  POKEMON_ERROR_CODES,
} from '../../src/Contexts/Pokemon/domain/model/PokemonError';
import { HomePage } from '../../src/Contexts/Pokemon/ui/pages/HomePage';

function buildCreator(): PokemonCreator {
  return new PokemonCreator(new InMemoryPokemonRepository());
}

describe('useCreatePokemon', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useCreatePokemon(buildCreator()));
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('transitions to success and exposes the Pokemon', async () => {
    const { result } = renderHook(() => useCreatePokemon(buildCreator()));
    act(() => result.current.setInput('pikachu'));
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.state.status).toBe('success');
    if (result.current.state.status === 'success') {
      expect(result.current.state.pokemon.name.value).toBe('pikachu');
    }
  });

  it('captures errors into the error state', async () => {
    const repo = new InMemoryPokemonRepository();
    repo.shouldFailCreate = new PokemonError(POKEMON_ERROR_CODES.notFound, 'no encontrado', 404);
    const creator = new PokemonCreator(repo);
    const { result } = renderHook(() => useCreatePokemon(creator));
    act(() => result.current.setInput('pikachu'));
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.state.status).toBe('error');
    if (result.current.state.status === 'error') {
      expect(result.current.state.code).toBe('POKEMON_NOT_FOUND');
    }
  });

  it('resets state and clears input', async () => {
    const { result } = renderHook(() => useCreatePokemon(buildCreator()));
    act(() => result.current.setInput('pikachu'));
    await act(async () => {
      await result.current.submit();
    });
    act(() => result.current.reset());
    expect(result.current.state).toEqual({ status: 'idle' });
    expect(result.current.input).toBe('');
  });

  it('aborts the previous request when submit is called again', async () => {
    const repo = new InMemoryPokemonRepository();
    let resolveFirst!: (value: unknown) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const createSpy = vi
      .spyOn(repo, 'create')
      .mockImplementationOnce(() => firstPromise as ReturnType<typeof repo.create>)
      .mockImplementationOnce(async (name) => {
        const pokemon = await new InMemoryPokemonRepository().create(name);
        return pokemon;
      });
    const creator = new PokemonCreator(repo);
    const { result } = renderHook(() => useCreatePokemon(creator));
    act(() => result.current.setInput('pikachu'));
    act(() => {
      result.current.submit();
    });
    act(() => result.current.setInput('raichu'));
    await act(async () => {
      resolveFirst(null);
      await result.current.submit();
    });
    if (result.current.state.status === 'success') {
      expect(result.current.state.pokemon.name.value).toBe('raichu');
    } else {
      throw new Error('expected success');
    }
    expect(createSpy).toHaveBeenCalled();
  });
});

describe('HomePage with hook', () => {
  it('renders and submits', async () => {
    render(<HomePage creator={buildCreator()} />);
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('pokemon-input'), { target: { value: 'pikachu' } });
    fireEvent.click(screen.getByTestId('pokemon-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('status-banner').dataset['status']).toBe('success');
    });
  });
});
