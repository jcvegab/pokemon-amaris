import { PokemonCreator } from '../Contexts/Pokemon/application/create/PokemonCreator';
import { ApiPokemonRepository } from '../Contexts/Pokemon/infrastructure/api/ApiPokemonRepository';
import { env } from '../Contexts/Shared/infrastructure/config/env';

export interface AppDependencies {
  pokemonCreator: PokemonCreator;
}

export function buildAppDependencies(): AppDependencies {
  const repository = new ApiPokemonRepository({
    baseUrl: env.VITE_API_BASE_URL,
    timeoutMs: env.VITE_API_TIMEOUT_MS,
  });
  const pokemonCreator = new PokemonCreator(repository);
  return { pokemonCreator };
}
