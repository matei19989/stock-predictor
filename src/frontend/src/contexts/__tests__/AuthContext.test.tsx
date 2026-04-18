import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import MockAdapter from 'axios-mock-adapter';
import api from '@/services/api';
import { AuthProvider, useAuthContext } from '../AuthContext';
import { TOKEN_KEY, USER_KEY } from '@/utils/constants';

/**
 * Forge a JWT whose exp claim is `secondsFromNow` away from now.
 * Only the payload section matters for client-side decoding — the signature
 * is never verified on the client.
 */
function makeJwt(secondsFromNow: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'user-1',
      email: 'm@example.com',
      unique_name: 'matei',
      iat: nowSec,
      exp: nowSec + secondsFromNow,
    }),
  );
  return `${header}.${payload}.sig`;
}

type Ctx = ReturnType<typeof useAuthContext>;
let ctxRef: Ctx | null = null;

function CaptureCtx() {
  ctxRef = useAuthContext();
  return null;
}

function mountProvider(initialPath = '/') {
  ctxRef = null;
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <CaptureCtx />
      </AuthProvider>
    </MemoryRouter>,
  );
  return () => {
    if (!ctxRef) throw new Error('AuthProvider did not render');
    return ctxRef;
  };
}

describe('AuthContext', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(api);
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    mock.restore();
  });

  it('starts unauthenticated when no token is stored', () => {
    const ctx = mountProvider()();
    expect(ctx.isAuthenticated).toBe(false);
    expect(ctx.token).toBeNull();
    expect(ctx.user).toBeNull();
  });

  it('restores a valid session from localStorage on mount', () => {
    const token = makeJwt(3600);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify({ username: 'matei', email: 'm@example.com' }));

    const ctx = mountProvider()();

    expect(ctx.isAuthenticated).toBe(true);
    expect(ctx.user).toEqual({ username: 'matei', email: 'm@example.com' });
  });

  it('falls back to sessionStorage when localStorage has no token', () => {
    sessionStorage.setItem(TOKEN_KEY, makeJwt(3600));
    sessionStorage.setItem(USER_KEY, JSON.stringify({ username: 'matei', email: 'm@example.com' }));

    const ctx = mountProvider()();

    expect(ctx.isAuthenticated).toBe(true);
  });

  it('clears storage and stays unauthenticated when the stored token is expired', () => {
    localStorage.setItem(TOKEN_KEY, makeJwt(-10));
    localStorage.setItem(USER_KEY, JSON.stringify({ username: 'old', email: 'o@example.com' }));

    const ctx = mountProvider()();

    expect(ctx.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('discards a stored token whose payload is not parseable', () => {
    localStorage.setItem(TOKEN_KEY, 'not.a.jwt');
    localStorage.setItem(USER_KEY, JSON.stringify({ username: 'x', email: 'y' }));

    const ctx = mountProvider()();

    expect(ctx.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('login without remember-me persists to sessionStorage only', async () => {
    mock.onPost('/api/auth/login').reply(200, {
      token: makeJwt(3600),
      username: 'matei',
      email: 'm@example.com',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    const getCtx = mountProvider();
    await act(async () => {
      await getCtx().login('m@example.com', 'pw', 'tt');
    });

    expect(sessionStorage.getItem(TOKEN_KEY)).toBeTruthy();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(getCtx().isAuthenticated).toBe(true);
    expect(getCtx().user).toEqual({ username: 'matei', email: 'm@example.com' });
  });

  it('login with remember-me persists to localStorage', async () => {
    mock.onPost('/api/auth/login').reply(200, {
      token: makeJwt(3600),
      username: 'matei',
      email: 'm@example.com',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    const getCtx = mountProvider();
    await act(async () => {
      await getCtx().login('m@example.com', 'pw', 'tt', true);
    });

    expect(localStorage.getItem(TOKEN_KEY)).toBeTruthy();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('register auto-confirmed branch signs the user in and returns null', async () => {
    mock.onPost('/api/auth/register').reply(201, {
      token: makeJwt(3600),
      username: 'matei',
      email: 'm@example.com',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    const getCtx = mountProvider();
    let result: string | null = 'sentinel';
    await act(async () => {
      result = await getCtx().register('matei', 'm@example.com', 'pw', 'tt');
    });

    expect(result).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeTruthy();
    expect(getCtx().isAuthenticated).toBe(true);
  });

  it('register pending branch does NOT sign in and returns the masked email', async () => {
    mock.onPost('/api/auth/register').reply(200, {
      message: 'Please confirm your email',
      email: 'm***@example.com',
    });

    const getCtx = mountProvider();
    let result: string | null = null;
    await act(async () => {
      result = await getCtx().register('matei', 'm@example.com', 'pw', 'tt');
    });

    expect(result).toBe('m***@example.com');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(getCtx().isAuthenticated).toBe(false);
  });

  it('logout clears both storages and resets context state', () => {
    localStorage.setItem(TOKEN_KEY, makeJwt(3600));
    localStorage.setItem(USER_KEY, JSON.stringify({ username: 'matei', email: 'm@example.com' }));
    sessionStorage.setItem(TOKEN_KEY, 'stray');
    sessionStorage.setItem(USER_KEY, 'stray');

    const getCtx = mountProvider();
    act(() => {
      getCtx().logout();
    });

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(USER_KEY)).toBeNull();
    expect(getCtx().isAuthenticated).toBe(false);
  });
});
