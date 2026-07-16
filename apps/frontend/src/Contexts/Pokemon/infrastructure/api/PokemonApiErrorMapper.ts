import {
  PokemonError,
  POKEMON_ERROR_CODES,
  type PokemonErrorCode,
} from '../../domain/model/PokemonError';
import { backendErrorResponseSchema } from './PokemonApiSchema';

const STATUS_TO_FALLBACK_CODE: Record<number, PokemonErrorCode> = {
  400: POKEMON_ERROR_CODES.validation,
  404: POKEMON_ERROR_CODES.notFound,
  502: POKEMON_ERROR_CODES.catalogUnavailable,
  503: POKEMON_ERROR_CODES.databaseUnavailable,
};

const STATUS_TO_FALLBACK_MESSAGE: Record<number, string> = {
  400: 'Revisa el nombre del Pokémon.',
  404: 'No encontramos ese Pokémon. Verifica la escritura.',
  502: 'No pudimos consultar la PokéAPI. Intenta de nuevo.',
  503: 'El servicio no está disponible. Intenta más tarde.',
};

const FALLBACK_MESSAGE = 'Ocurrió un error inesperado.';

const BACKEND_CODE_MAP: Record<string, PokemonErrorCode> = {
  INVALID_POKEMON_NAME: POKEMON_ERROR_CODES.invalidInput,
  VALIDATION_ERROR: POKEMON_ERROR_CODES.validation,
  POKEMON_NOT_FOUND: POKEMON_ERROR_CODES.notFound,
  POKEAPI_UNAVAILABLE: POKEMON_ERROR_CODES.catalogUnavailable,
  POKEAPI_BAD_RESPONSE: POKEMON_ERROR_CODES.catalogBadResponse,
  DATABASE_UNAVAILABLE: POKEMON_ERROR_CODES.databaseUnavailable,
  INTERNAL_ERROR: POKEMON_ERROR_CODES.internal,
};

function resolveCode(rawCode: string | undefined, statusCode: number): PokemonErrorCode {
  if (rawCode && rawCode in BACKEND_CODE_MAP) {
    return BACKEND_CODE_MAP[rawCode]!;
  }
  if (rawCode && (Object.values(POKEMON_ERROR_CODES) as string[]).includes(rawCode)) {
    return rawCode as PokemonErrorCode;
  }
  return STATUS_TO_FALLBACK_CODE[statusCode] ?? POKEMON_ERROR_CODES.unexpected;
}

function resolveMessage(rawMessage: string | undefined, statusCode: number): string {
  if (rawMessage && rawMessage.length > 0) {
    return rawMessage;
  }
  return STATUS_TO_FALLBACK_MESSAGE[statusCode] ?? FALLBACK_MESSAGE;
}

export function mapHttpErrorToPokemonError(statusCode: number, body: unknown): PokemonError {
  const parsed = backendErrorResponseSchema.safeParse(body);
  const rawCode = parsed.success ? parsed.data.code : undefined;
  const rawMessage = parsed.success ? parsed.data.message : undefined;
  const code = resolveCode(rawCode, statusCode);
  const message = resolveMessage(rawMessage, statusCode);
  return new PokemonError(code, message, statusCode);
}
