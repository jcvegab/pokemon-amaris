import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .min(1, 'VITE_API_BASE_URL is required')
    .default('/api')
    .refine((value) => value.startsWith('/') || /^https?:\/\//.test(value), {
      error: 'VITE_API_BASE_URL must start with "/" or be an absolute URL',
    }),
  VITE_API_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive('VITE_API_TIMEOUT_MS must be a positive integer')
    .prefault(8000),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const raw = {
    VITE_API_BASE_URL: import.meta.env['VITE_API_BASE_URL'],
    VITE_API_TIMEOUT_MS: import.meta.env['VITE_API_TIMEOUT_MS'],
  };
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment variables: ${issues}`);
  }
  return result.data;
}

export const env: Env = parseEnv();
