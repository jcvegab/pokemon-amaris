import { type Pokemon } from '../../domain/model/Pokemon';
import { type CreatePokemonResult } from '../../application/create/PokemonCreator';
import { type PokemonResponse } from './response/PokemonResponse';

export function pokemonToResponse(result: CreatePokemonResult): PokemonResponse {
  return toResponse(result.pokemon);
}

export function toResponse(pokemon: Pokemon): PokemonResponse {
  return {
    id: pokemon.id.value,
    name: pokemon.name.value,
    height: pokemon.height,
    weight: pokemon.weight,
    types: pokemon.types.toStringArray(),
    createdAt: pokemon.createdAt.toISOString(),
  };
}
