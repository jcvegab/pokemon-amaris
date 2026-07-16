import { Pokemon } from '../../domain/model/Pokemon';
import type { PokemonApiResponse } from './PokemonApiSchema';

export interface PokemonApiSnapshot {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  createdAt: string;
}

export class PokemonApiMapper {
  static toSnapshot(dto: PokemonApiResponse): PokemonApiSnapshot {
    return {
      id: dto.id,
      name: dto.name,
      height: dto.height,
      weight: dto.weight,
      types: dto.types,
      createdAt: dto.createdAt,
    };
  }

  static snapshotToPokemon(snapshot: PokemonApiSnapshot): Pokemon {
    return Pokemon.fromSnapshot(snapshot);
  }
}
