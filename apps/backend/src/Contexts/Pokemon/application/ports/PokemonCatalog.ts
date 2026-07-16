import { PokemonName } from '../../domain/model/PokemonName';

export interface PokemonCatalog {
  search(name: PokemonName): Promise<PokemonSnapshot>;
}

export interface PokemonSnapshot {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
}
