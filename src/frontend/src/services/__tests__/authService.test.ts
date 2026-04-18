import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '../api';
import * as authService from '../authService';
import { forgotPassword, resetPassword } from '../authService';

describe('authService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(api);
    localStorage.clear();
  });

  afterEach(() => {
    mock.restore();
  });

  it('login POSTs credentials + turnstile token and returns the AuthResponse', async () => {
    mock.onPost('/api/auth/login').reply(200, {
      token: 'jwt-abc',
      username: 'matei',
      email: 'm@example.com',
      expiresAt: '2027-01-01T00:00:00Z',
    });

    const res = await authService.login('m@example.com', 'pw', 'ts-token');

    expect(res.token).toBe('jwt-abc');
    const body = JSON.parse(mock.history.post[0].data);
    expect(body).toEqual({ email: 'm@example.com', password: 'pw', turnstileToken: 'ts-token' });
  });

  it('register POSTs username + email + password + turnstile token', async () => {
    mock.onPost('/api/auth/register').reply(201, {
      status: 'pending',
      email: 'm***@example.com',
    });

    const res = await authService.register('matei', 'm@example.com', 'pw', 'ts-token');

    expect(res).toEqual({ status: 'pending', email: 'm***@example.com' });
    const body = JSON.parse(mock.history.post[0].data);
    expect(body).toEqual({
      username: 'matei',
      email: 'm@example.com',
      password: 'pw',
      turnstileToken: 'ts-token',
    });
  });

  it('confirmEmail POSTs the token to /api/auth/confirm-email', async () => {
    mock.onPost('/api/auth/confirm-email').reply(200);

    await authService.confirmEmail('conf-xyz');

    const body = JSON.parse(mock.history.post[0].data);
    expect(body).toEqual({ token: 'conf-xyz' });
  });

  it('resendConfirmation sends email + turnstile token', async () => {
    mock.onPost('/api/auth/resend-confirmation').reply(200);

    await authService.resendConfirmation('m@example.com', 'ts-token');

    const body = JSON.parse(mock.history.post[0].data);
    expect(body).toEqual({ email: 'm@example.com', turnstileToken: 'ts-token' });
  });

  it('changePassword PUTs currentPassword + newPassword', async () => {
    mock.onPut('/api/auth/password').reply(204);

    await authService.changePassword('old', 'new');

    const body = JSON.parse(mock.history.put[0].data);
    expect(body).toEqual({ currentPassword: 'old', newPassword: 'new' });
  });

  it('forgotPassword posts to /api/auth/forgot-password', async () => {
    mock.onPost('/api/auth/forgot-password').reply(200, { message: 'ok' });
    await expect(
      forgotPassword('a@b.com', 'tt-token'),
    ).resolves.toBeUndefined();
    const body = JSON.parse(mock.history.post[0].data);
    expect(body.email).toBe('a@b.com');
    expect(body.turnstileToken).toBe('tt-token');
  });

  it('resetPassword posts to /api/auth/reset-password', async () => {
    mock.onPost('/api/auth/reset-password').reply(200);
    await expect(
      resetPassword('tok', 'newPass123'),
    ).resolves.toBeUndefined();
    const body = JSON.parse(mock.history.post[0].data);
    expect(body.token).toBe('tok');
    expect(body.newPassword).toBe('newPass123');
  });
});
