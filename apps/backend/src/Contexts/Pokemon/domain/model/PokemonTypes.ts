export class PokemonTypes {
  readonly value: readonly string[];

  constructor(value: unknown) {
    if (!Array.isArray(value)) {
      throw new InvalidPokemonTypesError('types must be an array');
    }
    if (value.length === 0) {
      throw new InvalidPokemonTypesError('types must not be empty');
    }
    const seen = new Set<string>();
    const names: string[] = [];
    for (const entry of value) {
      if (typeof entry !== 'string' || entry.length === 0) {
        throw new InvalidPokemonTypesError('each type must be a non-empty string');
      }
      const key = entry.toLowerCase();
      if (seen.has(key)) {
        throw new InvalidPokemonTypesError(`duplicate type: ${entry}`);
      }
      seen.add(key);
      names.push(entry);
    }
    this.value = Object.freeze(names);
  }

  toStringArray(): string[] {
    return [...this.value];
  }
}

export class InvalidPokemonTypesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPokemonTypesError';
  }
}
