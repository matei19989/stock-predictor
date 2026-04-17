import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTurnstile } from '@/hooks/useTurnstile';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { forgotPassword } from '@/services/authService';
import { ApiException } from '@/services/api';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');
  const [submitted, setSubmitted] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const { token: turnstileToken, isReady: turnstileReady, resetTurnstile } =
    useTurnstile(turnstileRef, 'forgot-password');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    if (!turnstileToken) {
      toast.error('Bot verification not ready. Please try again.');
      return;
    }
    try {
      await forgotPassword(data.email, turnstileToken);
      setSubmitted(true);
    } catch (err) {
      // Preserve info-leak prevention client-side too — tell the user the same
      // thing regardless of backend response.
      if (err instanceof ApiException && err.status === 429) {
        toast.error('Too many attempts. Please try again later.');
      } else if (err instanceof ApiException && err.status === 403) {
        toast.error('Verification failed. Please try again.');
      } else {
        setSubmitted(true);
      }
    } finally {
      resetTurnstile();
    }
  }

  if (submitted) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="font-heading text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          If an account exists with that email, we&apos;ve sent a password reset link.
          The link expires in 1 hour.
        </p>
        <Link to="/login" className="inline-block text-sm text-purple-400 hover:text-purple-300">
          ← Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold tracking-[-0.03em]">Reset your password</h1>
        <p className="text-sm text-gray-500">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs uppercase tracking-[0.1em] text-gray-400">
            Email
          </Label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
          />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div ref={turnstileRef} />

        <Button
          type="submit"
          disabled={isSubmitting || !turnstileReady || !turnstileToken}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white h-10 rounded-xl disabled:opacity-40"
        >
          {isSubmitting ? 'Sending\u2026' : 'Send reset link'}
        </Button>

        <Link to="/login" className="block text-center text-xs text-gray-500 hover:text-gray-300">
          ← Back to login
        </Link>
      </form>
    </div>
  );
}
