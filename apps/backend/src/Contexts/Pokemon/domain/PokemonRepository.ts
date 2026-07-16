import { Pokemon } from './model/Pokemon';
import { PokemonName } from './model/PokemonName';

export interface PokemonRepositorySaveOutcome {
  pokemon: Pokemon;
  created: boolean;
}

export interface PokemonRepository {
  findByName(name: PokemonName): Promise<Pokemon | null>;
  save(pokemon: Pokemon): Promise<PokemonRepositorySaveOutcome>;
}
