import api from './api';
import type { AuthResponse } from '@/types';

export async function login(email: string, password: string, turnstileToken: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password, turnstileToken });
  return data;
}

export async function register(
  username: string,
  email: string,
  password: string,
  turnstileToken: string
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/register', {
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
