import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import ProtectedRoute from '../ProtectedRoute';

const useAuthMock = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

function LoginMarker() {
  const loc = useLocation();
  return (
    <div data-testid="login-marker" data-pathname={loc.pathname} data-search={loc.search}>
      login page
    </div>
  );
}

function mount(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>protected dashboard content</div>} />
          <Route path="/settings" element={<div>protected settings content</div>} />
        </Route>
        <Route path="/login" element={<LoginMarker />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it('renders the nested route when the user is authenticated', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isLoading: false });

    mount('/dashboard');

    expect(screen.getByText('protected dashboard content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-marker')).not.toBeInTheDocument();
  });

  it('redirects to /login with a returnTo param when unauthenticated', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isLoading: false });

    mount('/dashboard');

    const marker = screen.getByTestId('login-marker');
    expect(marker.dataset.pathname).toBe('/login');
    expect(marker.dataset.search).toContain('returnTo=%2Fdashboard');
    expect(screen.queryByText('protected dashboard content')).not.toBeInTheDocument();
  });

  it('preserves the original path (including deeper routes) in returnTo', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isLoading: false });

    mount('/settings');

    const marker = screen.getByTestId('login-marker');
    expect(marker.dataset.search).toContain('returnTo=%2Fsettings');
  });
});
