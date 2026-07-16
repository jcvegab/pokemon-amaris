export const TOKENS = {
  pokedexNumberPadding: 3,
  spinnerDurationMs: 1200,
  formMaxLength: 50,
} as const;

export type TokenName = keyof typeof TOKENS;
