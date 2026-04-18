import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router';
import { ArrowLeft, EnvelopeSimple, LockKey } from '@phosphor-icons/react';
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

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#07080d] px-6">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/[0.07] rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] text-center space-y-8 animate-slide-up">
        {submitted ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <EnvelopeSimple weight="duotone" size={32} className="text-purple-400" />
            </div>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Check your email
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                If an account exists with that email, we&apos;ve sent a password reset link.
                <br />
                The link expires in 1 hour.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <LockKey weight="duotone" size={32} className="text-purple-400" />
            </div>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Reset your password
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Enter your email and we&apos;ll send you a link to set a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                  Email
                </Label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <div ref={turnstileRef} />

              <Button
                type="submit"
                disabled={isSubmitting || !turnstileReady || !turnstileToken}
                className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 font-medium rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:opacity-40"
              >
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          </>
        )}

        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-400 transition-colors duration-300"
        >
          <ArrowLeft weight="bold" size={14} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
