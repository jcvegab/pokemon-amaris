export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly body: unknown;

  constructor(params: { statusCode: number; code: string; message: string; body: unknown }) {
    super(params.message);
    this.name = 'HttpError';
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.body = params.body;
  }
}

export class NetworkError extends Error {
  readonly code = 'NETWORK_ERROR';

  constructor(
    message: string,
    override readonly cause: unknown,
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class RequestAbortedError extends Error {
  readonly code = 'ABORTED';

  constructor(override readonly cause: unknown) {
    super('Solicitud cancelada.');
    this.name = 'RequestAbortedError';
  }
}

export function isAbortErrorLike(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
}

export interface CombinedSignal {
  signal: AbortSignal;
  cancel: () => void;
  didTimeout: () => boolean;
}

export function combineSignals(
  external: AbortSignal | undefined,
  timeoutMs: number,
): CombinedSignal {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort(external?.reason);
  };
  if (external) {
    if (external.aborted) {
      onExternalAbort();
    } else {
      external.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cancel: () => {
      clearTimeout(timer);
      if (external) {
        external.removeEventListener('abort', onExternalAbort);
      }
      if (!controller.signal.aborted) {
        controller.abort(new DOMException('Caller cancelled', 'AbortError'));
      }
    },
    didTimeout: () => timedOut,
  };
}
