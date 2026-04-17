import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api, { ApiException } from '../api';
import { TOKEN_KEY, USER_KEY } from '@/utils/constants';

describe('api interceptors', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(api);
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    mock.restore();
  });

  it('attaches Authorization header from localStorage when token is present', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc-123');
    mock.onGet('/api/probe').reply(200, { ok: true });

    await api.get('/api/probe');

    expect(mock.history.get[0].headers?.Authorization).toBe('Bearer abc-123');
  });

  it('falls back to sessionStorage when localStorage has no token', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'session-xyz');
    mock.onGet('/api/probe').reply(200, {});

    await api.get('/api/probe');

    expect(mock.history.get[0].headers?.Authorization).toBe('Bearer session-xyz');
  });

  it('omits Authorization when no token is stored', async () => {
    mock.onGet('/api/probe').reply(200, {});

    await api.get('/api/probe');

    expect(mock.history.get[0].headers?.Authorization).toBeUndefined();
  });

  it('wraps ProblemDetails responses in an ApiException', async () => {
    mock.onGet('/api/boom').reply(409, {
      status: 409,
      title: 'Conflict',
      detail: 'Email already in use',
      correlationId: 'corr-1',
    });

    await expect(api.get('/api/boom')).rejects.toMatchObject({
      name: 'ApiException',
      status: 409,
      title: 'Conflict',
      detail: 'Email already in use',
      correlationId: 'corr-1',
    });
  });

  it('normalizes non-ProblemDetails errors as Network Error', async () => {
    mock.onGet('/api/boom').networkError();

    const err = (await api.get('/api/boom').catch((e: unknown) => e)) as ApiException;

    expect(err).toBeInstanceOf(ApiException);
    expect(err.title).toBe('Network Error');
  });

  it('clears both storages and redirects to /login on 401', async () => {
    localStorage.setItem(TOKEN_KEY, 'stale');
    localStorage.setItem(USER_KEY, 'u');
    sessionStorage.setItem(TOKEN_KEY, 'stale-s');
    sessionStorage.setItem(USER_KEY, 'u-s');

    const hrefSetter = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, set href(v: string) { hrefSetter(v); } },
    });

    mock.onGet('/api/protected').reply(401, {
      status: 401,
      title: 'Unauthorized',
      detail: 'Token expired',
    });

    await expect(api.get('/api/protected')).rejects.toBeInstanceOf(ApiException);

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(USER_KEY)).toBeNull();
    expect(hrefSetter).toHaveBeenCalledWith('/login');
  });
});
