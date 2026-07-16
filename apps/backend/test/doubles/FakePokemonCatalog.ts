import {
  type PokemonCatalog,
  type PokemonSnapshot,
} from '../../src/Contexts/Pokemon/application/ports/PokemonCatalog';
import { type PokemonName } from '../../src/Contexts/Pokemon/domain/model/PokemonName';

export class FakePokemonCatalog implements PokemonCatalog {
  public calls: PokemonName[] = [];
  public response: PokemonSnapshot = {
    id: 25,
    name: 'pikachu',
    height: 4,
    weight: 60,
    types: ['electric'],
  };
  public shouldThrow: Error | null = null;

  async search(name: PokemonName): Promise<PokemonSnapshot> {
    this.calls.push(name);
    if (this.shouldThrow) {
      throw this.shouldThrow;
    }
    return this.response;
  }
}
