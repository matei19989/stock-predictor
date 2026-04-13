import { useRef } from 'react';
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

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const { register: registerUser } = useAuth();
  const turnstileRef = useRef<HTMLDivElement>(null);
  const { token: turnstileToken, isReady, resetTurnstile } = useTurnstile(turnstileRef, 'register');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterFormData) {
    if (!turnstileToken) return;
    try {
      await registerUser(data.username, data.email, data.password, turnstileToken);
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 409) toast.error('Email or username already taken');
        else if (err.status === 403) toast.error('Verification failed. Please try again.');
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
        <Label htmlFor="username" className="text-sm font-medium text-gray-300">
          Username
        </Label>
        <input
          id="username"
          type="text"
          {...register('username')}
          className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
          placeholder="Enter your username"
        />
        {errors.username && (
          <p className="text-xs text-red-400">{errors.username.message}</p>
        )}
      </div>

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

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
          Confirm Password
        </Label>
        <input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
          className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
          placeholder="••••••••"
        />
        {errors.confirmPassword && (
          <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div ref={turnstileRef} />

      <Button
        type="submit"
        disabled={isSubmitting || !isReady || !turnstileToken}
        className="group w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 h-12 text-sm font-medium rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
      >
        <span className="flex items-center justify-center gap-2">
          {isSubmitting ? 'Creating account\u2026' : !isReady ? 'Verifying\u2026' : 'Create Account'}
          {!isSubmitting && isReady && turnstileToken && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
              <ArrowRight weight="bold" size={12} />
            </span>
          )}
        </span>
      </Button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-purple-400 hover:text-purple-300 transition-colors duration-300"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
