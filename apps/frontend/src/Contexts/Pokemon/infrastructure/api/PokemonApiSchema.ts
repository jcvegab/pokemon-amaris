import { z } from 'zod';

export const pokemonApiResponseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  height: z.number().int().nonnegative(),
  weight: z.number().int().nonnegative(),
  types: z.array(z.string().min(1)).min(1),
  createdAt: z.string().min(1),
});

export type PokemonApiResponse = z.infer<typeof pokemonApiResponseSchema>;

export const backendErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  code: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.string().optional(),
  path: z.string().optional(),
});

export type BackendErrorResponse = z.infer<typeof backendErrorResponseSchema>;
