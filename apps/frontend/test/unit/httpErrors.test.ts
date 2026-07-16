import { describe, expect, it } from 'vitest';
import {
  combineSignals,
  isAbortErrorLike,
} from '../../src/Contexts/Shared/infrastructure/http/httpErrors';

describe('combineSignals', () => {
  it('returns a signal and a cancel function', () => {
    const { signal, cancel, didTimeout } = combineSignals(undefined, 1000);
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
    cancel();
    expect(signal.aborted).toBe(true);
    expect(didTimeout()).toBe(false);
  });

  it('aborts when the external signal aborts', () => {
    const external = new AbortController();
    const { signal } = combineSignals(external.signal, 1000);
    external.abort();
    expect(signal.aborted).toBe(true);
  });

  it('aborts when already aborted externally', () => {
    const external = new AbortController();
    external.abort();
    const { signal } = combineSignals(external.signal, 1000);
    expect(signal.aborted).toBe(true);
  });

  it('flags timeout when timer elapses', async () => {
    const { signal, didTimeout } = combineSignals(undefined, 10);
    await new Promise((r) => setTimeout(r, 25));
    expect(signal.aborted).toBe(true);
    expect(didTimeout()).toBe(true);
  });
});

describe('isAbortErrorLike', () => {
  it('detects DOMException AbortError', () => {
    const err = new DOMException('cancelled', 'AbortError');
    expect(isAbortErrorLike(err)).toBe(true);
  });
  it('detects Error with AbortError name', () => {
    expect(isAbortErrorLike(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe(true);
  });
  it('returns false for other errors', () => {
    expect(isAbortErrorLike(new Error('boom'))).toBe(false);
    expect(isAbortErrorLike(null)).toBe(false);
  });
});
