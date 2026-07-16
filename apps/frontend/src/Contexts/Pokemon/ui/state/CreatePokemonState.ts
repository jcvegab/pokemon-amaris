import type { Pokemon } from '../../domain/model/Pokemon';

export type CreatePokemonState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; pokemon: Pokemon }
  | { status: 'error'; message: string; code: string };

export const initialCreatePokemonState: CreatePokemonState = { status: 'idle' };
