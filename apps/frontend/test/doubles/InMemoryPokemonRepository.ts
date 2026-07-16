import type { Pokemon as PokemonI } from '../../src/Contexts/Pokemon/domain/model/Pokemon';
import type { PokemonName } from '../../src/Contexts/Pokemon/domain/model/PokemonName';
import {
  type PokemonRepository,
  type PokemonRepositoryCreateOutcome,
} from '../../src/Contexts/Pokemon/application/ports/PokemonRepository';
import { type PokemonError } from '../../src/Contexts/Pokemon/domain/model/PokemonError';
import { Pokemon } from '../../src/Contexts/Pokemon/domain/model/Pokemon';

export class InMemoryPokemonRepository implements PokemonRepository {
  public records = new Map<string, PokemonI>();
  public shouldFailFind: PokemonError | null = null;
  public shouldFailCreate: PokemonError | null = null;

  async findByName(name: PokemonName): Promise<PokemonI | null> {
    if (this.shouldFailFind) throw this.shouldFailFind;
    return this.records.get(name.value) ?? null;
  }

  async create(name: PokemonName): Promise<PokemonRepositoryCreateOutcome> {
    if (this.shouldFailCreate) throw this.shouldFailCreate;
    const existing = this.records.get(name.value);
    if (existing) {
      return { pokemon: existing, created: false };
    }
    const pokemon = Pokemon.fromSnapshot({
      id: 1,
      name: name.value,
      height: 1,
      weight: 1,
      types: ['normal'],
      createdAt: new Date().toISOString(),
    });
    this.records.set(name.value, pokemon);
    return { pokemon, created: true };
  }
}
