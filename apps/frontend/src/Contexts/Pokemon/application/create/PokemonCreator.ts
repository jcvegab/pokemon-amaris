import { type Pokemon } from '../../domain/model/Pokemon';
import { PokemonName } from '../../domain/model/PokemonName';
import { PokemonError, POKEMON_ERROR_CODES } from '../../domain/model/PokemonError';
import type { PokemonRepository, PokemonRepositoryCreateOutcome } from '../ports/PokemonRepository';

export interface CreatePokemonInput {
  rawName: string;
}

export class PokemonCreator {
  constructor(private readonly repository: PokemonRepository) {}

  async execute({ rawName }: CreatePokemonInput): Promise<PokemonRepositoryCreateOutcome> {
    const name = this.parseName(rawName);

    const existing = await this.safeFind(name);
    if (existing) {
      return { pokemon: existing, created: false };
    }

    return this.repository.create(name);
  }

  private parseName(rawName: string): PokemonName {
    try {
      return new PokemonName(rawName);
    } catch (err) {
      if (err instanceof Error) {
        throw new PokemonError(POKEMON_ERROR_CODES.invalidInput, err.message);
      }
      throw err;
    }
  }

  private async safeFind(name: PokemonName): Promise<Pokemon | null> {
    try {
      return await this.repository.findByName(name);
    } catch (err) {
      if (err instanceof PokemonError) {
        throw err;
      }
      throw new PokemonError(
        POKEMON_ERROR_CODES.unexpected,
        err instanceof Error ? err.message : 'unknown error',
      );
    }
  }
}
