import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ResetPasswordPage from '../ResetPasswordPage';
import { ApiException } from '@/services/api';

const resetPasswordMock = vi.fn();
vi.mock('@/services/authService', () => ({
  resetPassword: (token: string, pw: string) => resetPasswordMock(token, pw),
}));

describe('ResetPasswordPage', () => {
  it('renders invalid-link state when token is missing', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
  });

  it('submits and shows success, then navigates to /login', async () => {
    resetPasswordMock.mockResolvedValueOnce(undefined);
    render(
      <MemoryRouter initialEntries={['/reset-password?token=good']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'brandNew1');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'brandNew1');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));
    await waitFor(() => {
      expect(screen.getByText(/password reset/i)).toBeInTheDocument();
    });
  });

  it('shows expired state on 410', async () => {
    resetPasswordMock.mockRejectedValueOnce(
      new ApiException({ status: 410, title: 'Gone', detail: 'Expired' }),
    );
    render(
      <MemoryRouter initialEntries={['/reset-password?token=old']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'brandNew1');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'brandNew1');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));
    await waitFor(() => {
      expect(screen.getByText(/reset link expired/i)).toBeInTheDocument();
    });
  });

  it('shows invalid state on 404', async () => {
    resetPasswordMock.mockRejectedValueOnce(
      new ApiException({ status: 404, title: 'NotFound', detail: 'nope' }),
    );
    render(
      <MemoryRouter initialEntries={['/reset-password?token=bogus']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'brandNew1');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'brandNew1');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
    });
  });
});
