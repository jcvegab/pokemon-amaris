import { PokemonName } from './PokemonName';

export interface PokemonProps {
  id: number;
  name: PokemonName;
  height: number;
  weight: number;
  types: readonly string[];
  createdAt: Date;
}

export class Pokemon {
  readonly id: number;
  readonly name: PokemonName;
  readonly height: number;
  readonly weight: number;
  readonly types: readonly string[];
  readonly createdAt: Date;

  private constructor(props: PokemonProps) {
    this.id = props.id;
    this.name = props.name;
    this.height = props.height;
    this.weight = props.weight;
    this.types = Object.freeze([...props.types]);
    this.createdAt = props.createdAt;
  }

  static fromSnapshot(snapshot: {
    id: number;
    name: string;
    height: number;
    weight: number;
    types: readonly string[];
    createdAt: string;
  }): Pokemon {
    const createdAt = new Date(snapshot.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error(`Invalid createdAt timestamp: ${snapshot.createdAt}`);
    }
    return new Pokemon({
      id: snapshot.id,
      name: new PokemonName(snapshot.name),
      height: snapshot.height,
      weight: snapshot.weight,
      types: snapshot.types,
      createdAt,
    });
  }
}
