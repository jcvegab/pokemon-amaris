export class PokemonId {
  readonly value: number;

  constructor(value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new InvalidPokemonIdError(value);
    }
    this.value = value;
  }

  equals(other: PokemonId): boolean {
    return this.value === other.value;
  }
}

export class InvalidPokemonIdError extends Error {
  constructor(value: unknown) {
    super(`Invalid Pokemon id: ${String(value)} (must be a positive integer)`);
    this.name = 'InvalidPokemonIdError';
  }
}
