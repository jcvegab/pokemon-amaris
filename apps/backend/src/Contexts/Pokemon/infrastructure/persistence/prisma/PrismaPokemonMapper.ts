import { Prisma } from '../../../../../generated/prisma/client';
import { Pokemon } from '../../../domain/model/Pokemon';

export interface PrismaPokemonRecord {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  createdAt: Date;
}

export class PrismaPokemonMapper {
  static toDomain(record: PrismaPokemonRecord): Pokemon {
    return Pokemon.rehydrate({
      id: record.id,
      name: record.name,
      height: record.height,
      weight: record.weight,
      types: record.types,
      createdAt: record.createdAt,
    });
  }

  static toCreateInput(pokemon: Pokemon): Prisma.PokemonUncheckedCreateInput {
    return {
      id: pokemon.id.value,
      name: pokemon.name.value,
      height: pokemon.height,
      weight: pokemon.weight,
      types: pokemon.types.toStringArray(),
    };
  }
}
