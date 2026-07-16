export class PokemonNotFoundError extends Error {
  readonly code = 'POKEMON_NOT_FOUND';

  constructor(name: string) {
    super(`Pokemon not found: ${name}`);
    this.name = 'PokemonNotFoundError';
  }
}

export class PokemonCatalogUnavailableError extends Error {
  readonly code = 'POKEAPI_UNAVAILABLE';

  constructor(message: string) {
    super(message);
    this.name = 'PokemonCatalogUnavailableError';
  }
}

export class PokemonCatalogBadResponseError extends Error {
  readonly code = 'POKEAPI_BAD_RESPONSE';

  constructor(message: string) {
    super(message);
    this.name = 'PokemonCatalogBadResponseError';
  }
}

export class PokemonPersistenceUnavailableError extends Error {
  readonly code = 'DATABASE_UNAVAILABLE';

  constructor(message: string) {
    super(message);
    this.name = 'PokemonPersistenceUnavailableError';
  }
}
