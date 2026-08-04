import { Prisma, type PrismaClient } from '../../../../../generated/prisma/client';
import { type Pokemon } from '../../../domain/model/Pokemon';
import { PokemonName } from '../../../domain/model/PokemonName';
import {
  type PokemonRepository,
  type PokemonRepositorySaveOutcome,
} from '../../../domain/PokemonRepository';
import { PokemonPersistenceUnavailableError } from '../../../application/errors/PokemonApplicationErrors';
import { PrismaPokemonMapper, type PrismaPokemonRecord } from './PrismaPokemonMapper';

const P2002_UNIQUE_CONSTRAINT = 'P2002';

export class PrismaPokemonRepository implements PokemonRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByName(name: PokemonName): Promise<Pokemon | null> {
    const record = await this.prisma.pokemon.findUnique({
      where: { name: name.value },
    });
    if (!record) {
      return null;
    }
    return PrismaPokemonMapper.toDomain(toRecord(record));
  }

  async save(pokemon: Pokemon): Promise<PokemonRepositorySaveOutcome> {
    try {
      const created = await this.prisma.pokemon.create({
        data: PrismaPokemonMapper.toCreateInput(pokemon),
      });
      return { pokemon: PrismaPokemonMapper.toDomain(toRecord(created)), created: true };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === P2002_UNIQUE_CONSTRAINT
      ) {
        const existing = await this.findByName(pokemon.name);
        if (existing) {
          return { pokemon: existing, created: false };
        }
      }
      throw new PokemonPersistenceUnavailableError(
        err instanceof Error ? err.message : 'database write failed',
      );
    }
  }
}

function toRecord(row: {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  createdAt: Date;
}): PrismaPokemonRecord {
  return {
    id: row.id,
    name: row.name,
    height: row.height,
    weight: row.weight,
    types: row.types,
    createdAt: row.createdAt,
  };
}
