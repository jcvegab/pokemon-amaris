import type { CSSProperties } from 'react';
import { TOKENS } from './tokens';

export interface PokeballProps {
  size?: number;
  spinning?: boolean;
  className?: string;
  title?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

export function Pokeball({
  size = 64,
  spinning = false,
  className,
  title = 'Pokébola',
  'aria-hidden': ariaHidden,
}: PokeballProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    animation: spinning ? `pokeball-spin ${TOKENS.spinnerDurationMs}ms linear infinite` : undefined,
  };
  const isDecorative = ariaHidden === true || ariaHidden === 'true';
  const role = isDecorative ? 'presentation' : 'img';
  const ariaProps: Record<string, string | boolean> = isDecorative
    ? { 'aria-hidden': true }
    : { role, 'aria-label': title };

  return (
    <svg
      {...ariaProps}
      viewBox="0 0 64 64"
      className={className}
      style={style}
      data-testid="pokeball"
    >
      <defs>
        <clipPath id="pokeball-bottom">
          <rect x="0" y="32" width="64" height="32" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30" fill="#dc2626" />
      <g clipPath="url(#pokeball-bottom)">
        <circle cx="32" cy="32" r="30" fill="#f8fafc" />
      </g>
      <circle cx="32" cy="32" r="30" fill="none" stroke="#0f172a" strokeWidth="2" />
      <rect x="0" y="30" width="64" height="4" fill="#0f172a" />
      <circle cx="32" cy="32" r="8" fill="#facc15" stroke="#0f172a" strokeWidth="2" />
      <circle cx="32" cy="32" r="3" fill="#0f172a" />
    </svg>
  );
}
