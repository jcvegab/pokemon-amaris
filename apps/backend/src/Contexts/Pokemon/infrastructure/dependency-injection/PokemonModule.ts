import { Module, type Provider } from '@nestjs/common';
import { PokemonCreator } from '../../application/create/PokemonCreator';
import { PokemonPostController } from '../http/PokemonPostController';
import { PokeApiHttpModule } from '../pokeapi/PokeApiHttpModule';
import { PokeApiPokemonCatalog } from '../pokeapi/PokeApiPokemonCatalog';
import { PrismaPokemonRepository } from '../persistence/prisma/PrismaPokemonRepository';
import { POKEMON_CATALOG, POKEMON_CREATOR, POKEMON_REPOSITORY } from './PokemonTokens';

const pokemonRepositoryProvider: Provider = {
  provide: POKEMON_REPOSITORY,
  useClass: PrismaPokemonRepository,
};

const pokemonCatalogProvider: Provider = {
  provide: POKEMON_CATALOG,
  useClass: PokeApiPokemonCatalog,
};

const pokemonCreatorProvider: Provider = {
  provide: POKEMON_CREATOR,
  inject: [POKEMON_REPOSITORY, POKEMON_CATALOG],
  useFactory: (repository, catalog) => new PokemonCreator(repository, catalog),
};

@Module({
  imports: [PokeApiHttpModule],
  controllers: [PokemonPostController],
  providers: [
    PrismaPokemonRepository,
    pokemonRepositoryProvider,
    pokemonCatalogProvider,
    pokemonCreatorProvider,
  ],
})
export class PokemonModule {}
