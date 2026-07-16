import { ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { InvalidPokemonNameApplicationError } from '../../../../Contexts/Pokemon/application/create/PokemonCreator';
import {
  PokemonCatalogBadResponseError,
  PokemonCatalogUnavailableError,
  PokemonNotFoundError,
  PokemonPersistenceUnavailableError,
} from '../../../../Contexts/Pokemon/application/errors/PokemonApplicationErrors';

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
  path: string;
}

interface ErrorMapping {
  status: number;
  code: string;
  message: string;
}

const PUBLIC_ERROR_MESSAGES = {
  invalidName: 'Invalid pokemon name',
  notFound: 'Pokemon not found',
  catalogUnavailable: 'Pokemon catalog unavailable',
  catalogBadResponse: 'Pokemon catalog returned an invalid response',
  persistenceUnavailable: 'Database unavailable',
  internal: 'Unexpected error',
} as const;

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (
        body &&
        typeof body === 'object' &&
        (body as Record<string, unknown>)['status'] === 'error' &&
        'error' in (body as Record<string, unknown>) &&
        'info' in (body as Record<string, unknown>)
      ) {
        if (process.env['LOG_LEVEL'] !== 'silent') {
          this.logger.warn({
            requestId: request.id,
            method: request.method,
            path: request.url,
            status: exception.getStatus(),
            msg: 'health check failed',
          });
        }
        response.status(exception.getStatus()).json(body);
        return;
      }
    }

    if (process.env['LOG_LEVEL'] === 'silent') {
      this.writeResponse(response, request, this.mapException(exception));
      return;
    }

    const mapping = this.mapException(exception);
    const errorBody: ErrorBody = {
      statusCode: mapping.status,
      code: mapping.code,
      message: mapping.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.error({
      requestId: request.id,
      method: request.method,
      path: request.url,
      status: mapping.status,
      code: mapping.code,
      message: exception instanceof Error ? exception.message : mapping.message,
      ...(process.env['NODE_ENV'] !== 'production' && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
    });

    response.status(mapping.status).json(errorBody);
  }

  private writeResponse(response: Response, request: Request, mapping: ErrorMapping): void {
    const errorBody: ErrorBody = {
      statusCode: mapping.status,
      code: mapping.code,
      message: mapping.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    response.status(mapping.status).json(errorBody);
  }

  private mapException(exception: unknown): ErrorMapping {
    if (exception instanceof InvalidPokemonNameApplicationError) {
      return { status: 400, code: 'INVALID_POKEMON_NAME', message: exception.message };
    }
    if (exception instanceof PokemonNotFoundError) {
      return {
        status: 404,
        code: 'POKEMON_NOT_FOUND',
        message: PUBLIC_ERROR_MESSAGES.notFound,
      };
    }
    if (exception instanceof PokemonCatalogUnavailableError) {
      return {
        status: 502,
        code: 'POKEAPI_UNAVAILABLE',
        message: PUBLIC_ERROR_MESSAGES.catalogUnavailable,
      };
    }
    if (exception instanceof PokemonCatalogBadResponseError) {
      return {
        status: 502,
        code: 'POKEAPI_BAD_RESPONSE',
        message: PUBLIC_ERROR_MESSAGES.catalogBadResponse,
      };
    }
    if (exception instanceof PokemonPersistenceUnavailableError) {
      return {
        status: 503,
        code: 'DATABASE_UNAVAILABLE',
        message: PUBLIC_ERROR_MESSAGES.persistenceUnavailable,
      };
    }
    if (exception instanceof HttpException) {
      return mapHttpException(exception);
    }
    return { status: 500, code: 'INTERNAL_ERROR', message: PUBLIC_ERROR_MESSAGES.internal };
  }
}

function mapHttpException(exception: HttpException): ErrorMapping {
  const status = exception.getStatus();
  const body = exception.getResponse();
  if (typeof body === 'string') {
    return { status, code: 'VALIDATION_ERROR', message: body };
  }
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    const message = firstValidationMessage(obj['message']);
    const code = isUpperCaseString(obj['error']) ? (obj['error'] as string) : 'VALIDATION_ERROR';
    return { status, code, message };
  }
  return { status, code: 'VALIDATION_ERROR', message: 'Request failed' };
}

function firstValidationMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0] as string;
  }
  return 'Validation failed';
}

function isUpperCaseString(value: unknown): boolean {
  return typeof value === 'string' && value === value.toUpperCase();
}
