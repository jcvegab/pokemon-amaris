import { useCallback, useEffect, useRef, useState } from 'react';
import type { PokemonCreator } from '../../application/create/PokemonCreator';
import { PokemonError } from '../../domain/model/PokemonError';
import { initialCreatePokemonState, type CreatePokemonState } from '../state/CreatePokemonState';
import { RequestAbortedError } from '../../../Shared/infrastructure/http/httpErrors';

export interface UseCreatePokemonResult {
  state: CreatePokemonState;
  input: string;
  setInput: (value: string) => void;
  submit: () => Promise<void>;
  reset: () => void;
  abort: () => void;
}

export function useCreatePokemon(creator: PokemonCreator): UseCreatePokemonResult {
  const [state, setState] = useState<CreatePokemonState>(initialCreatePokemonState);
  const [input, setInput] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const controller = controllerRef.current;
      if (controller) {
        controller.abort();
        controllerRef.current = null;
      }
    };
  }, []);

  const abort = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    controllerRef.current = null;
    controller.abort();
  }, []);

  const reset = useCallback(() => {
    const controller = controllerRef.current;
    if (controller) {
      controllerRef.current = null;
      controller.abort();
    }
    setState(initialCreatePokemonState);
    setInput('');
  }, []);

  const submit = useCallback(async (): Promise<void> => {
    const previous = controllerRef.current;
    if (previous) {
      controllerRef.current = null;
      previous.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'loading' });

    try {
      const outcome = await creator.execute({
        rawName: input,
      });
      if (!isMountedRef.current || controllerRef.current !== controller) {
        return;
      }
      setState({ status: 'success', pokemon: outcome.pokemon });
    } catch (err) {
      if (!isMountedRef.current || controllerRef.current !== controller) {
        return;
      }
      if (controller.signal.aborted || err instanceof RequestAbortedError) {
        return;
      }
      const message =
        err instanceof PokemonError
          ? err.message
          : err instanceof Error
            ? err.message || 'Ocurrió un error inesperado.'
            : 'Ocurrió un error inesperado.';
      const code = err instanceof PokemonError ? err.code : 'UNEXPECTED_ERROR';
      setState({ status: 'error', message, code });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, [creator, input]);

  return { state, input, setInput, submit, reset, abort };
}
