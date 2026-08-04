import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().prefault(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  POKEAPI_BASE_URL: z.url('POKEAPI_BASE_URL must be a valid URL'),
  POKEAPI_TIMEOUT_MS: z.coerce.number().int().positive().prefault(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type EnvVars = z.infer<typeof envSchema>;
