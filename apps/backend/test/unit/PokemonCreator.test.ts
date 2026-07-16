import {
  InvalidPokemonNameApplicationError,
  PokemonCreator,
} from '../../src/Contexts/Pokemon/application/create/PokemonCreator';
import {
  PokemonCatalogBadResponseError,
  PokemonCatalogUnavailableError,
  PokemonNotFoundError,
  PokemonPersistenceUnavailableError,
} from '../../src/Contexts/Pokemon/application/errors/PokemonApplicationErrors';
import { Pokemon } from '../../src/Contexts/Pokemon/domain/model/Pokemon';
import { PokemonName } from '../../src/Contexts/Pokemon/domain/model/PokemonName';
import { FakePokemonCatalog } from '../doubles/FakePokemonCatalog';
import { InMemoryPokemonRepository } from '../doubles/InMemoryPokemonRepository';

describe('PokemonCreator', () => {
  let repository: InMemoryPokemonRepository;
  let catalog: FakePokemonCatalog;
  let creator: PokemonCreator;

  beforeEach(() => {
    repository = new InMemoryPokemonRepository();
    catalog = new FakePokemonCatalog();
    creator = new PokemonCreator(repository, catalog);
  });

  it('creates a new pokemon and persists it', async () => {
    const result = await creator.execute({ rawName: 'pikachu' });
    expect(result.created).toBe(true);
    expect(result.pokemon.id.value).toBe(25);
    expect(result.pokemon.name.value).toBe('pikachu');
    expect(catalog.calls).toHaveLength(1);
    expect(catalog.calls[0]!.value).toBe('pikachu');
  });

  it('returns existing pokemon without calling the catalog', async () => {
    repository.records.set(
      'pikachu',
      Pokemon.rehydrate({
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        types: ['electric'],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );

    const result = await creator.execute({ rawName: 'pikachu' });
    expect(result.created).toBe(false);
    expect(result.pokemon.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(catalog.calls).toHaveLength(0);
  });

  it('normalizes the input before lookup and persistence', async () => {
    await creator.execute({ rawName: '  PIKACHU  ' });
    expect(catalog.calls[0]!.value).toBe('pikachu');
    expect(repository.records.get('pikachu')?.name.equals(new PokemonName('pikachu'))).toBe(true);
  });

  it('throws InvalidPokemonNameApplicationError for empty string', async () => {
    await expect(creator.execute({ rawName: '' })).rejects.toBeInstanceOf(
      InvalidPokemonNameApplicationError,
    );
  });

  it('throws InvalidPokemonNameApplicationError for invalid characters', async () => {
    await expect(creator.execute({ rawName: 'pikachu!' })).rejects.toBeInstanceOf(
      InvalidPokemonNameApplicationError,
    );
  });

  it('wraps repository read errors as PokemonPersistenceUnavailableError', async () => {
    const brokenRepo = {
      findByName: jest.fn().mockRejectedValue(new Error('connection refused')),
      save: jest.fn(),
    };
    const sut = new PokemonCreator(
      brokenRepo as unknown as Parameters<typeof PokemonCreator>[0],
      catalog,
    );
    await expect(sut.execute({ rawName: 'pikachu' })).rejects.toBeInstanceOf(
      PokemonPersistenceUnavailableError,
    );
  });

  it('wraps repository write errors as PokemonPersistenceUnavailableError', async () => {
    const brokenRepo = {
      findByName: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockRejectedValue(new Error('write timeout')),
    };
    const sut = new PokemonCreator(
      brokenRepo as unknown as Parameters<typeof PokemonCreator>[0],
      catalog,
    );
    await expect(sut.execute({ rawName: 'pikachu' })).rejects.toBeInstanceOf(
      PokemonPersistenceUnavailableError,
    );
  });

  it('propagates catalog not found errors', async () => {
    catalog.shouldThrow = new PokemonNotFoundError('pikachu');
    await expect(creator.execute({ rawName: 'pikachu' })).rejects.toBeInstanceOf(
      PokemonNotFoundError,
    );
  });

  it('propagates catalog unavailable errors', async () => {
    catalog.shouldThrow = new PokemonCatalogUnavailableError('down');
    await expect(creator.execute({ rawName: 'pikachu' })).rejects.toBeInstanceOf(
      PokemonCatalogUnavailableError,
    );
  });

  it('propagates catalog bad response errors', async () => {
    catalog.shouldThrow = new PokemonCatalogBadResponseError('bad shape');
    await expect(creator.execute({ rawName: 'pikachu' })).rejects.toBeInstanceOf(
      PokemonCatalogBadResponseError,
    );
  });

  it('wraps unknown catalog errors as PokemonCatalogUnavailableError', async () => {
    catalog.shouldThrow = new Error('boom');
    await expect(creator.execute({ rawName: 'pikachu' })).rejects.toBeInstanceOf(
      PokemonCatalogUnavailableError,
    );
  });

  it('throws PokemonNotFoundError when catalog returns a different name', async () => {
    catalog.response = { ...catalog.response, name: 'raichu' };
    await expect(creator.execute({ rawName: 'pikachu' })).rejects.toBeInstanceOf(
      PokemonNotFoundError,
    );
  });
});
