import { PokemonId } from './PokemonId';
import { PokemonName } from './PokemonName';
import { PokemonTypes } from './PokemonTypes';

export interface PokemonProps {
  id: PokemonId;
  name: PokemonName;
  height: number;
  weight: number;
  types: PokemonTypes;
  createdAt: Date;
}

export class Pokemon {
  readonly id: PokemonId;
  readonly name: PokemonName;
  readonly height: number;
  readonly weight: number;
  readonly types: PokemonTypes;
  readonly createdAt: Date;

  private constructor(props: PokemonProps) {
    this.id = props.id;
    this.name = props.name;
    this.height = props.height;
    this.weight = props.weight;
    this.types = props.types;
    this.createdAt = props.createdAt;
  }

  static create(input: {
    id: number;
    name: string;
    height: number;
    weight: number;
    types: string[];
    createdAt?: Date;
  }): Pokemon {
    return new Pokemon({
      id: new PokemonId(input.id),
      name: new PokemonName(input.name),
      height: validateMeasurement(input.height, 'height'),
      weight: validateMeasurement(input.weight, 'weight'),
      types: new PokemonTypes(input.types),
      createdAt: input.createdAt ?? new Date(),
    });
  }

  static rehydrate(record: {
    id: number;
    name: string;
    height: number;
    weight: number;
    types: string[];
    createdAt: Date;
  }): Pokemon {
    return new Pokemon({
      id: new PokemonId(record.id),
      name: new PokemonName(record.name),
      height: validateMeasurement(record.height, 'height'),
      weight: validateMeasurement(record.weight, 'weight'),
      types: new PokemonTypes(record.types),
      createdAt: record.createdAt,
    });
  }
}

function validateMeasurement(value: number, label: 'height' | 'weight'): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidPokemonMeasurementError(`${label} must be a non-negative integer`);
  }
  return value;
}

export class InvalidPokemonMeasurementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPokemonMeasurementError';
  }
}
