import api from './api';
import type { AuthResponse, RegisterResponse } from '@/types';

export async function login(email: string, password: string, turnstileToken: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password, turnstileToken });
  return data;
}

export async function register(
  username: string,
  email: string,
  password: string,
  turnstileToken: string
): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>('/api/auth/register', {
    username,
    email,
    password,
    turnstileToken,
  });
  return data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await api.put('/api/auth/password', { currentPassword, newPassword });
}

export async function confirmEmail(token: string): Promise<void> {
  await api.post('/api/auth/confirm-email', { token });
}

export async function resendConfirmation(email: string, turnstileToken: string): Promise<void> {
  await api.post('/api/auth/resend-confirmation', { email, turnstileToken });
}

export async function forgotPassword(email: string, turnstileToken: string): Promise<void> {
  await api.post('/api/auth/forgot-password', { email, turnstileToken });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post('/api/auth/reset-password', { token, newPassword });
}
