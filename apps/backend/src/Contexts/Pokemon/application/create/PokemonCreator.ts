import { InvalidPokemonNameError, PokemonName } from '../../domain/model/PokemonName';
import { Pokemon } from '../../domain/model/Pokemon';
import {
  type PokemonRepository,
  type PokemonRepositorySaveOutcome,
} from '../../domain/PokemonRepository';
import { type PokemonCatalog, type PokemonSnapshot } from '../ports/PokemonCatalog';
import {
  PokemonCatalogBadResponseError,
  PokemonCatalogUnavailableError,
  PokemonNotFoundError,
  PokemonPersistenceUnavailableError,
} from '../errors/PokemonApplicationErrors';

export interface CreatePokemonCommand {
  rawName: string;
}

export type CreatePokemonResult = PokemonRepositorySaveOutcome;

export class InvalidPokemonNameApplicationError extends Error {
  readonly code = 'INVALID_POKEMON_NAME';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidPokemonNameApplicationError';
  }
}

export class PokemonCreator {
  constructor(
    private readonly repository: PokemonRepository,
    private readonly catalog: PokemonCatalog,
  ) {}

  async execute({ rawName }: CreatePokemonCommand): Promise<CreatePokemonResult> {
    const name = this.parseName(rawName);

    const existing = await this.safeFind(name);
    if (existing) {
      return { pokemon: existing, created: false };
    }

    const snapshot = await this.searchInCatalog(name);

    if (snapshot.name !== name.value) {
      throw new PokemonNotFoundError(name.value);
    }

    const pokemon = Pokemon.create(snapshot);
    return this.safeSave(pokemon);
  }

  private parseName(rawName: string): PokemonName {
    try {
      return new PokemonName(rawName);
    } catch (err) {
      if (err instanceof InvalidPokemonNameError) {
        throw new InvalidPokemonNameApplicationError(err.message);
      }
      throw err;
    }
  }

  private async safeFind(name: PokemonName): Promise<Pokemon | null> {
    try {
      return await this.repository.findByName(name);
    } catch (err) {
      throw new PokemonPersistenceUnavailableError(
        err instanceof Error ? err.message : 'database read failed',
      );
    }
  }

  private async safeSave(pokemon: Pokemon): Promise<CreatePokemonResult> {
    try {
      return await this.repository.save(pokemon);
    } catch (err) {
      if (err instanceof PokemonPersistenceUnavailableError) {
        throw err;
      }
      throw new PokemonPersistenceUnavailableError(
        err instanceof Error ? err.message : 'database write failed',
      );
    }
  }

  private async searchInCatalog(name: PokemonName): Promise<PokemonSnapshot> {
    try {
      return await this.catalog.search(name);
    } catch (err) {
      if (
        err instanceof PokemonNotFoundError ||
        err instanceof PokemonCatalogUnavailableError ||
        err instanceof PokemonCatalogBadResponseError
      ) {
        throw err;
      }
      throw new PokemonCatalogUnavailableError(
        err instanceof Error ? err.message : 'catalog request failed',
      );
    }
  }
}
