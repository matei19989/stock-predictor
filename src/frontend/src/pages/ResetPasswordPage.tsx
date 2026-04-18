import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { CheckCircle, Clock, LockKey, XCircle, ArrowLeft } from '@phosphor-icons/react';
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
        else toast.error(err.detail);
      }
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#07080d] px-6">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/[0.07] rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] text-center space-y-8 animate-slide-up">
        {state === 'form' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <LockKey weight="duotone" size={32} className="text-purple-400" />
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Pick a new password
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                At least 8 characters, different from your old one.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-sm font-medium text-gray-300">
                  New password
                </Label>
                <input
                  id="newPassword"
                  type="password"
                  {...register('newPassword')}
                  className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
                />
                {errors.newPassword && (
                  <p className="text-xs text-red-400">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                  Confirm new password
                </Label>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 font-medium rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:opacity-40"
              >
                {isSubmitting ? 'Resetting…' : 'Reset password'}
              </Button>
            </form>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle weight="duotone" size={32} className="text-emerald-400" />
            </div>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Password reset
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Redirecting to login…
              </p>
            </div>
          </>
        )}

        {state === 'expired' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Clock weight="duotone" size={32} className="text-amber-400" />
            </div>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Reset link expired
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                This link has expired. Reset links are valid for 1 hour.
              </p>
            </div>
            <Link to="/forgot-password">
              <Button className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 font-medium rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
                Request a new link
              </Button>
            </Link>
          </>
        )}

        {state === 'invalid' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
              <XCircle weight="duotone" size={32} className="text-red-400" />
            </div>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Invalid reset link
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                This link is invalid or has already been used.
              </p>
            </div>
            <Link to="/forgot-password">
              <Button className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 font-medium rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
                Request a new link
              </Button>
            </Link>
          </>
        )}

        {state !== 'success' && (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-400 transition-colors duration-300"
          >
            <ArrowLeft weight="bold" size={14} />
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
