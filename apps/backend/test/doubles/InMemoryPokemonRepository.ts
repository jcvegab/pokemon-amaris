import {
  type PokemonRepository,
  type PokemonRepositorySaveOutcome,
} from '../../src/Contexts/Pokemon/domain/PokemonRepository';
import { Pokemon } from '../../src/Contexts/Pokemon/domain/model/Pokemon';

class InMemoryPokemonRepository implements PokemonRepository {
  public records = new Map<string, Pokemon>();

  constructor(initial: Array<{ id: number; name: string; types: string[]; createdAt: Date }> = []) {
    for (const record of initial) {
      const pokemon = Pokemon.rehydrate(record);
      this.records.set(record.name, pokemon);
    }
  }

  async findByName(name: { value: string }): Promise<Pokemon | null> {
    return this.records.get(name.value) ?? null;
  }

  async save(pokemon: Pokemon): Promise<PokemonRepositorySaveOutcome> {
    const existing = this.records.get(pokemon.name.value);
    if (existing) {
      return { pokemon: existing, created: false };
    }
    this.records.set(pokemon.name.value, pokemon);
    return { pokemon, created: true };
  }
}

export { InMemoryPokemonRepository };
