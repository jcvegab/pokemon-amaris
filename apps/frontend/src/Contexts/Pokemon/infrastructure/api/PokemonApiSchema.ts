import { z } from 'zod';

export const pokemonApiResponseSchema = z.object({
  id: z.int().positive(),
  name: z.string().min(1),
  height: z.int().nonnegative(),
  weight: z.int().nonnegative(),
  types: z.array(z.string().min(1)).min(1),
  createdAt: z.string().min(1),
});

export type PokemonApiResponse = z.infer<typeof pokemonApiResponseSchema>;

export const backendErrorResponseSchema = z.object({
  statusCode: z.int(),
  code: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.string().optional(),
  path: z.string().optional(),
});

export type BackendErrorResponse = z.infer<typeof backendErrorResponseSchema>;
