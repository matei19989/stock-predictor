import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowRight, User, Lock, Moon, Sun, ChartLine,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useWatchlist } from '@/hooks/useWatchlist';
import { ApiException } from '@/services/api';
import { changePassword } from '@/services/authService';
import { getPreferences, updatePreferences } from '@/services/preferencesService';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePredictionLog } from '@/hooks/usePredictionLog';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

function AnimatedToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        enabled
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_16px_rgba(168,85,247,0.3)]'
          : 'bg-white/[0.08]'
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {enabled ? (
          <Moon size={10} weight="bold" className="text-purple-600" />
        ) : (
          <Sun size={10} weight="bold" className="text-gray-400" />
        )}
      </span>
    </button>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { user } = useAuth();
  const { items } = useWatchlist();

  // Preferences
  const [notifications, setNotifications] = useState(() => {
    try { return localStorage.getItem('sp_notifications') !== 'false'; } catch { return true; }
  });
  const [defaultRange, setDefaultRange] = useState(() => {
    try { return localStorage.getItem('sp_default_range') ?? '1Y'; } catch { return '1Y'; }
  });

  useEffect(() => {
    getPreferences()
      .then((prefs) => {
        setNotifications(prefs.notificationsEnabled);
        localStorage.setItem('sp_notifications', String(prefs.notificationsEnabled));
        setDefaultRange(prefs.defaultChartRange);
        localStorage.setItem('sp_default_range', prefs.defaultChartRange);
      })
      .catch(() => { /* localStorage defaults used as fallback */ });
  }, []);

  async function toggleNotifications() {
    const prev = notifications;
    const next = !prev;
    setNotifications(next);
    localStorage.setItem('sp_notifications', String(next));
    try {
      await updatePreferences({ notificationsEnabled: next, defaultChartRange: defaultRange });
      toast.success(next ? 'Notifications enabled' : 'Notifications disabled');
    } catch {
      setNotifications(prev);
      localStorage.setItem('sp_notifications', String(prev));
      toast.error('Failed to update preference');
    }
  }

  async function changeDefaultRange(range: string) {
    const prev = defaultRange;
    setDefaultRange(range);
    localStorage.setItem('sp_default_range', range);
    try {
      await updatePreferences({ notificationsEnabled: notifications, defaultChartRange: range });
      toast.success(`Default chart range set to ${range}`);
    } catch {
      setDefaultRange(prev);
      localStorage.setItem('sp_default_range', prev);
      toast.error('Failed to update preference');
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });

  async function onSubmit(data: PasswordFormData) {
    try {
      await changePassword(data.currentPassword, data.newPassword);
      toast.success('Password changed successfully');
      reset();
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 401) toast.error('Current password is incorrect');
        else toast.error(err.detail);
      } else {
        toast.error('An unexpected error occurred');
      }
    }
  }

  // Account stats
  const { count: predictedCount } = usePredictionLog();

  return (
    <div className="mx-auto max-w-2xl space-y-8 animate-slide-up">
      {/* Page header */}
      <div className="space-y-2">
        <span className="inline-block rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-purple-400">
          Account
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em]">Settings</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Manage your profile, preferences, and security
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
        <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="px-6 pt-5 pb-3 border-b border-white/[0.06] flex items-center gap-2">
            <User size={14} weight="light" className="text-purple-400" />
            <span className="font-heading text-sm font-semibold tracking-[-0.02em]">Profile</span>
          </div>
          <div className="px-6 py-6">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/[0.08] text-2xl font-bold text-purple-300 shrink-0">
                {user?.username?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="space-y-3 flex-1">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-gray-500">Username</p>
                  <p className="text-sm font-medium">{user?.username}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-gray-500">Email</p>
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ChartLine size={12} weight="light" className="text-purple-400" />
                  <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Watchlist</span>
                </div>
                <p className="font-heading text-2xl font-bold tracking-[-0.03em]">{items.length}</p>
                <p className="text-[11px] text-gray-600">stocks tracked</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ChartLine size={12} weight="light" className="text-purple-400" />
                  <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Predictions</span>
                </div>
                <p className="font-heading text-2xl font-bold tracking-[-0.03em]">{predictedCount}</p>
                <p className="text-[11px] text-gray-600">predictions generated</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Card */}
      <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
        <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="px-6 pt-5 pb-3 border-b border-white/[0.06] flex items-center gap-2">
            <Moon size={14} weight="light" className="text-purple-400" />
            <span className="font-heading text-sm font-semibold tracking-[-0.02em]">Preferences</span>
          </div>
          <div className="px-6 py-5 space-y-5">
            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Toast Notifications</p>
                <p className="text-[11px] text-gray-500">Show success and error alerts</p>
              </div>
              <AnimatedToggle enabled={notifications} onToggle={toggleNotifications} />
            </div>

            {/* Default chart range */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Default Chart Range</p>
                <p className="text-[11px] text-gray-500">Initial time range when viewing a stock</p>
              </div>
              <div className="flex gap-1">
                {['1M', '3M', '6M', '1Y', '5Y'].map(r => (
                  <button
                    key={r}
                    onClick={() => changeDefaultRange(r)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      defaultRange === r
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Card */}
      <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
        <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="px-6 pt-5 pb-3 border-b border-white/[0.06] flex items-center gap-2">
            <Lock size={14} weight="light" className="text-purple-400" />
            <span className="font-heading text-sm font-semibold tracking-[-0.02em]">Change Password</span>
          </div>
          <div className="px-6 py-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword" className="text-xs uppercase tracking-[0.1em] text-gray-400">
                  Current Password
                </Label>
                <input
                  id="currentPassword"
                  type="password"
                  {...register('currentPassword')}
                  className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
                />
                {errors.currentPassword && (
                  <p className="text-xs text-red-400">{errors.currentPassword.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs uppercase tracking-[0.1em] text-gray-400">
                  New Password
                </Label>
                <input
                  id="newPassword"
                  type="password"
                  {...register('newPassword')}
                  className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
                />
                {errors.newPassword && (
                  <p className="text-xs text-red-400">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-[0.1em] text-gray-400">
                  Confirm New Password
                </Label>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="group bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 h-10 px-6 text-sm font-medium rounded-xl shadow-[0_0_25px_rgba(168,85,247,0.2)] hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  {isSubmitting ? 'Changing…' : 'Change Password'}
                  {!isSubmitting && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                      <ArrowRight weight="bold" size={10} />
                    </span>
                  )}
                </span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
