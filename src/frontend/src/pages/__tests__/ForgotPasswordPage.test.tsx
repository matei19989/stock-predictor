import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ForgotPasswordPage from '../ForgotPasswordPage';

vi.mock('@/hooks/useTurnstile', () => ({
  useTurnstile: () => ({
    token: 'stub-token',
    isReady: true,
    resetTurnstile: vi.fn(),
  }),
}));

vi.mock('@/services/authService', () => ({
  forgotPassword: vi.fn().mockResolvedValue(undefined),
}));

describe('ForgotPasswordPage', () => {
  it('submits the email and shows the success screen', async () => {
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });
});
