export const POKEMON_NAME_PATTERN = /^[a-z0-9-]+$/;
export const POKEMON_NAME_MAX_LENGTH = 50;

export class PokemonName {
  readonly value: string;

  constructor(value: string) {
    if (typeof value !== 'string') {
      throw new InvalidPokemonNameError('name must be a string');
    }
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new InvalidPokemonNameError('name must not be empty');
    }
    if (normalized.length > POKEMON_NAME_MAX_LENGTH) {
      throw new InvalidPokemonNameError(
        `name must be at most ${POKEMON_NAME_MAX_LENGTH} characters`,
      );
    }
    if (!POKEMON_NAME_PATTERN.test(normalized)) {
      throw new InvalidPokemonNameError(
        'name must match ^[a-z0-9-]+$ (lowercase letters, digits, dashes)',
      );
    }
    this.value = normalized;
  }

  equals(other: PokemonName): boolean {
    return this.value === other.value;
  }
}

export class InvalidPokemonNameError extends Error {
  readonly code = 'INVALID_INPUT';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidPokemonNameError';
  }
}
