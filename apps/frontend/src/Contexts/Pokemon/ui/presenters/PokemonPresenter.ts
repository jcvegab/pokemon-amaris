import type { Pokemon } from '../../domain/model/Pokemon';

const HEIGHT_UNIT_DM = 0.1;
const WEIGHT_UNIT_HG = 0.1;
const POKEDEX_NUMBER_PADDING = 3;

export function formatHeight(dm: number): string {
  if (!Number.isFinite(dm)) return '—';
  const meters = dm * HEIGHT_UNIT_DM;
  return `${meters.toFixed(1)} m`;
}

export function formatWeight(hg: number): string {
  if (!Number.isFinite(hg)) return '—';
  const kilograms = hg * WEIGHT_UNIT_HG;
  return `${kilograms.toFixed(1)} kg`;
}

export function formatPokedexNumber(id: number): string {
  if (!Number.isInteger(id) || id < 0) return '#???';
  return `#${String(id).padStart(POKEDEX_NUMBER_PADDING, '0')}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export interface PokemonViewModel {
  id: number;
  name: string;
  displayName: string;
  height: string;
  weight: string;
  pokedexNumber: string;
  types: readonly string[];
  createdAt: string;
  createdAtDisplay: string;
}

export function toPokemonViewModel(pokemon: Pokemon): PokemonViewModel {
  return {
    id: pokemon.id,
    name: pokemon.name.value,
    displayName: capitalize(pokemon.name.value),
    height: formatHeight(pokemon.height),
    weight: formatWeight(pokemon.weight),
    pokedexNumber: formatPokedexNumber(pokemon.id),
    types: pokemon.types,
    createdAt: pokemon.createdAt.toISOString(),
    createdAtDisplay: formatDate(pokemon.createdAt.toISOString()),
  };
}
