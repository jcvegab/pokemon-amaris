import { type PokemonSnapshot } from '../../application/ports/PokemonCatalog';
import { type PokeApiPokemonDto } from './PokeApiPokemonSchema';

export class PokeApiPokemonMapper {
  static toSnapshot(dto: PokeApiPokemonDto): PokemonSnapshot {
    return {
      id: dto.id,
      name: dto.name,
      height: dto.height,
      weight: dto.weight,
      types: dto.types.map((entry) => entry.type.name),
    };
  }
}
