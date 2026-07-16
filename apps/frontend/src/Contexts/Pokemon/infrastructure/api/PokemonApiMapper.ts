import { Pokemon } from '../../domain/model/Pokemon';
import type { PokeApiPokemonDto } from './PokemonApiSchema';

export interface PokemonApiSnapshot {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  createdAt: string;
}

export class PokemonApiMapper {
  static toSnapshot(dto: PokeApiPokemonDto, createdAt: string): PokemonApiSnapshot {
    return {
      id: dto.id,
      name: dto.name,
      height: dto.height,
      weight: dto.weight,
      types: dto.types.map((entry) => entry.type.name),
      createdAt,
    };
  }

  static snapshotToPokemon(snapshot: PokemonApiSnapshot): Pokemon {
    return Pokemon.fromSnapshot(snapshot);
  }
}
