import { Prisma, type PrismaClient } from '@prisma/client';
import { PrismaPokemonRepository } from '../../src/Contexts/Pokemon/infrastructure/persistence/prisma/PrismaPokemonRepository';
import { Pokemon } from '../../src/Contexts/Pokemon/domain/model/Pokemon';
import { PokemonName } from '../../src/Contexts/Pokemon/domain/model/PokemonName';
import { PokemonPersistenceUnavailableError } from '../../src/Contexts/Pokemon/application/errors/PokemonApplicationErrors';

type PrismaStub = {
  pokemon: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

function makePrismaStub(): PrismaStub {
  return {
    pokemon: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
}

describe('PrismaPokemonRepository', () => {
  let prisma: PrismaStub;
  let repo: PrismaPokemonRepository;

  beforeEach(() => {
    prisma = makePrismaStub();
    repo = new PrismaPokemonRepository(prisma as unknown as PrismaClient);
  });

  describe('findByName', () => {
    it('returns null when the record is not found', async () => {
      prisma.pokemon.findUnique.mockResolvedValue(null);
      const result = await repo.findByName(new PokemonName('pikachu'));
      expect(result).toBeNull();
      expect(prisma.pokemon.findUnique).toHaveBeenCalledWith({
        where: { name: 'pikachu' },
      });
    });

    it('rehydrates a record into a Pokemon entity', async () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      prisma.pokemon.findUnique.mockResolvedValue({
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        types: ['electric'],
        createdAt,
      });
      const result = await repo.findByName(new PokemonName('pikachu'));
      expect(result).toBeInstanceOf(Pokemon);
      expect(result!.id.value).toBe(25);
      expect(result!.name.value).toBe('pikachu');
      expect(result!.types.toStringArray()).toEqual(['electric']);
      expect(result!.createdAt).toBe(createdAt);
    });
  });

  describe('save', () => {
    const pikachu = Pokemon.create({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      types: ['electric'],
    });

    it('persists a new pokemon and returns created=true', async () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      prisma.pokemon.create.mockResolvedValue({
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        types: ['electric'],
        createdAt,
      });

      const result = await repo.save(pikachu);
      expect(result.created).toBe(true);
      expect(prisma.pokemon.create).toHaveBeenCalledWith({
        data: {
          id: 25,
          name: 'pikachu',
          height: 4,
          weight: 60,
          types: ['electric'],
        },
      });
    });

    it('returns created=false when a P2002 conflict is detected', async () => {
      const existingCreatedAt = new Date('2025-12-01T00:00:00.000Z');
      const conflictError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
      });
      prisma.pokemon.create.mockRejectedValue(conflictError);
      prisma.pokemon.findUnique.mockResolvedValue({
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        types: ['electric'],
        createdAt: existingCreatedAt,
      });

      const result = await repo.save(pikachu);
      expect(result.created).toBe(false);
      expect(result.pokemon.createdAt).toBe(existingCreatedAt);
    });

    it('wraps write errors as PokemonPersistenceUnavailableError', async () => {
      prisma.pokemon.create.mockRejectedValue(new Error('write timeout'));
      await expect(repo.save(pikachu)).rejects.toBeInstanceOf(PokemonPersistenceUnavailableError);
    });
  });
});
