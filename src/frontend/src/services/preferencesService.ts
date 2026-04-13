import api from './api';
import type { UserPreferences } from '@/types';

export async function getPreferences(): Promise<UserPreferences> {
  const { data } = await api.get<UserPreferences>('/api/users/preferences');
  return data;
}

export async function updatePreferences(prefs: UserPreferences): Promise<void> {
  await api.put('/api/users/preferences', prefs);
}
