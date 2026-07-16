import { z } from 'zod';

const namedApiResourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
});

const pokeApiTypesSchema = z
  .array(
    z.object({
      slot: z.number().int().positive(),
      type: namedApiResourceSchema,
    }),
  )
  .min(1);

export const pokeApiPokemonDtoSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  height: z.number().int().nonnegative(),
  weight: z.number().int().nonnegative(),
  types: pokeApiTypesSchema,
});

export type PokeApiPokemonDto = z.infer<typeof pokeApiPokemonDtoSchema>;

export const backendErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  code: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.string().optional(),
  path: z.string().optional(),
});

export type BackendErrorResponse = z.infer<typeof backendErrorResponseSchema>;
