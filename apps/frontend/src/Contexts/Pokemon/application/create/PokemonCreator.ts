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
    try {
      return await this.repository.create(name);
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
}
