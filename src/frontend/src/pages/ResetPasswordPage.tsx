import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { resetPassword } from '@/services/authService';
import { ApiException } from '@/services/api';

const schema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof schema>;

type State = 'form' | 'success' | 'invalid' | 'expired';

export default function ResetPasswordPage() {
  useDocumentTitle('Reset password');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [state, setState] = useState<State>(token ? 'form' : 'invalid');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      await resetPassword(token, data.newPassword);
      setState('success');
      toast.success('Password reset. Please log in.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 404) setState('invalid');
        else if (err.status === 410) setState('expired');
        else if (err.status === 409) toast.error(err.detail);
        else toast.error(err.detail);
      }
    }
  }

  if (state === 'invalid') {
    return (
      <div className="w-full max-w-md space-y-5 text-center">
        <h1 className="font-heading text-2xl font-bold">Invalid reset link</h1>
        <p className="text-sm text-gray-400">
          This link is invalid or has already been used.
        </p>
        <Link to="/forgot-password" className="inline-block text-sm text-purple-400 hover:text-purple-300">
          Request a new link →
        </Link>
      </div>
    );
  }

  if (state === 'expired') {
    return (
      <div className="w-full max-w-md space-y-5 text-center">
        <h1 className="font-heading text-2xl font-bold">Reset link expired</h1>
        <p className="text-sm text-gray-400">
          This link has expired. Reset links are valid for 1 hour.
        </p>
        <Link to="/forgot-password" className="inline-block text-sm text-purple-400 hover:text-purple-300">
          Request a new link →
        </Link>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="w-full max-w-md space-y-5 text-center">
        <h1 className="font-heading text-2xl font-bold">Password reset</h1>
        <p className="text-sm text-gray-400">Redirecting to login\u2026</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold tracking-[-0.03em]">Pick a new password</h1>
        <p className="text-sm text-gray-500">At least 8 characters, different from your old one.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword" className="text-xs uppercase tracking-[0.1em] text-gray-400">
            New password
          </Label>
          <input
            id="newPassword"
            type="password"
            {...register('newPassword')}
            className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
          />
          {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-[0.1em] text-gray-400">
            Confirm new password
          </Label>
          <input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
          />
          {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white h-10 rounded-xl disabled:opacity-40"
        >
          {isSubmitting ? 'Resetting\u2026' : 'Reset password'}
        </Button>
      </form>
    </div>
  );
}
