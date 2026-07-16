export const POKEMON_ERROR_CODES = {
  invalidInput: 'INVALID_INPUT',
  validation: 'VALIDATION_ERROR',
  notFound: 'POKEMON_NOT_FOUND',
  catalogUnavailable: 'POKEAPI_UNAVAILABLE',
  catalogBadResponse: 'POKEAPI_BAD_RESPONSE',
  databaseUnavailable: 'DATABASE_UNAVAILABLE',
  network: 'NETWORK_ERROR',
  unexpected: 'UNEXPECTED_ERROR',
  internal: 'INTERNAL_ERROR',
} as const;

export type PokemonErrorCode = (typeof POKEMON_ERROR_CODES)[keyof typeof POKEMON_ERROR_CODES];

export class PokemonError extends Error {
  readonly code: PokemonErrorCode;
  readonly statusCode?: number;

  constructor(code: PokemonErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = 'PokemonError';
    this.code = code;
    if (statusCode !== undefined) {
      this.statusCode = statusCode;
    }
  }
}
