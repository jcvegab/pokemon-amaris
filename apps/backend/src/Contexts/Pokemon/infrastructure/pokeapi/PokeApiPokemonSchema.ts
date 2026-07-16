import { z } from 'zod';

const namedApiResourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
});

export const pokeApiPokemonSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  height: z.number().int().nonnegative(),
  weight: z.number().int().nonnegative(),
  types: z
    .array(
      z.object({
        slot: z.number().int().positive(),
        type: namedApiResourceSchema,
      }),
    )
    .min(1),
});

export type PokeApiPokemonDto = z.infer<typeof pokeApiPokemonSchema>;
