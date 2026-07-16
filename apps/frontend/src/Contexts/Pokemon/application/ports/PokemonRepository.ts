export { type PokemonErrorCode } from '../../domain/model/PokemonError';

import type { Pokemon } from '../../domain/model/Pokemon';
import type { PokemonName } from '../../domain/model/PokemonName';

export interface PokemonRepositoryCreateOutcome {
  pokemon: Pokemon;
  created: boolean;
}

export interface PokemonRepository {
  create(input: PokemonName): Promise<PokemonRepositoryCreateOutcome>;
}
