import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { ApiException } from '@/services/api';
import { useTurnstile } from '@/hooks/useTurnstile';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { login } = useAuth();
  const [rememberMe, setRememberMe] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const { token: turnstileToken, isReady, resetTurnstile } = useTurnstile(turnstileRef, 'login');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginFormData) {
    if (!turnstileToken) return;
    try {
      await login(data.email, data.password, turnstileToken, rememberMe);
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 401) toast.error('Invalid email or password');
        else if (err.status === 403) {
          if (err.detail?.toLowerCase().includes('confirm'))
            toast.error('Please confirm your email before logging in.');
          else
            toast.error('Verification failed. Please try again.');
        }
        else if (err.status === 429) toast.error('Too many attempts. Please try again later.');
        else toast.error(err.detail);
      }
    } finally {
      resetTurnstile();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-gray-300">
          Email
        </Label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
          placeholder="Enter your email"
        />
        {errors.email && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium text-gray-300">
          Password
        </Label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border border-white/10 bg-white/[0.04] accent-purple-500 cursor-pointer"
          />
          <span className="text-sm text-gray-400">Remember me</span>
        </label>
      </div>

      <div ref={turnstileRef} />

      <Button
        type="submit"
        disabled={isSubmitting || !isReady || !turnstileToken}
        className="group w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 h-12 text-sm font-medium rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
      >
        <span className="flex items-center justify-center gap-2">
          {isSubmitting ? 'Signing in\u2026' : !isReady ? 'Verifying\u2026' : 'Sign In'}
          {!isSubmitting && isReady && turnstileToken && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
              <ArrowRight weight="bold" size={12} />
            </span>
          )}
        </span>
      </Button>

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="text-purple-400 hover:text-purple-300 transition-colors duration-300"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
