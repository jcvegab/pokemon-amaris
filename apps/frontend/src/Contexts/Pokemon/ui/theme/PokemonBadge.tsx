import type { CSSProperties } from 'react';

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  normal: { bg: '#a8a878', fg: '#0f172a' },
  fire: { bg: '#f08030', fg: '#0f172a' },
  water: { bg: '#6890f0', fg: '#f8fafc' },
  electric: { bg: '#f8d030', fg: '#0f172a' },
  grass: { bg: '#78c850', fg: '#0f172a' },
  ice: { bg: '#98d8d8', fg: '#0f172a' },
  fighting: { bg: '#c03028', fg: '#f8fafc' },
  poison: { bg: '#a040a0', fg: '#f8fafc' },
  ground: { bg: '#e0c068', fg: '#0f172a' },
  flying: { bg: '#a890f0', fg: '#0f172a' },
  psychic: { bg: '#f85888', fg: '#f8fafc' },
  bug: { bg: '#a8b820', fg: '#0f172a' },
  rock: { bg: '#b8a038', fg: '#0f172a' },
  ghost: { bg: '#705898', fg: '#f8fafc' },
  dragon: { bg: '#7038f8', fg: '#f8fafc' },
  dark: { bg: '#705848', fg: '#f8fafc' },
  steel: { bg: '#b8b8d0', fg: '#0f172a' },
  fairy: { bg: '#ee99ac', fg: '#0f172a' },
};

const FALLBACK = { bg: '#94a3b8', fg: '#0f172a' };

export interface PokemonBadgeProps {
  type: string;
  className?: string;
}

export function PokemonBadge({ type, className }: PokemonBadgeProps) {
  const palette = TYPE_COLORS[type.toLowerCase()] ?? FALLBACK;
  const style: CSSProperties = {
    backgroundColor: palette.bg,
    color: palette.fg,
  };
  return (
    <span
      className={
        'inline-flex items-center rounded-full border-2 border-slate-900 px-2 py-0.5 text-xs font-semibold capitalize ' +
        (className ?? '')
      }
      style={style}
      data-testid="pokemon-badge"
      data-type={type.toLowerCase()}
    >
      {type}
    </span>
  );
}
