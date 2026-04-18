import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle, XCircle, Clock, ArrowLeft, PaperPlaneTilt } from '@phosphor-icons/react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useTurnstile } from '@/hooks/useTurnstile';
import { confirmEmail, resendConfirmation } from '@/services/authService';
import { ApiException } from '@/services/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';

type Status = 'loading' | 'success' | 'expired' | 'invalid';

export default function ConfirmEmailPage() {
  useDocumentTitle('Confirm Email');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>('loading');
  const [resendEmail, setResendEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const hasRun = useRef(false);

  const turnstileRef = useRef<HTMLDivElement>(null);
  const { token: turnstileToken, isReady, resetTurnstile } = useTurnstile(turnstileRef, 'resend-confirm');

  useEffect(() => {
    if (!token || hasRun.current) {
      if (!token) setStatus('invalid');
      return;
    }
    hasRun.current = true;

    confirmEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        if (err instanceof ApiException) {
          if (err.status === 410) setStatus('expired');
          else setStatus('invalid');
        } else {
          setStatus('invalid');
        }
      });
  }, [token]);

  const handleResend = useCallback(async () => {
    if (!turnstileToken || !resendEmail) return;
    setIsSending(true);
    try {
      await resendConfirmation(resendEmail, turnstileToken);
      toast.success('If an account exists, a new confirmation email has been sent.');
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setIsSending(false);
      resetTurnstile();
    }
  }, [turnstileToken, resendEmail, resetTurnstile]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#07080d] px-6">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/[0.07] rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] text-center space-y-8 animate-slide-up">
        {status === 'loading' && <LoadingSpinner />}

        {status === 'success' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle weight="duotone" size={32} className="text-emerald-400" />
            </div>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Email confirmed
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Your account is now active. You can sign in.
              </p>
            </div>
            <Link to="/login">
              <Button className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 font-medium rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
                Go to sign in
              </Button>
            </Link>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Clock weight="duotone" size={32} className="text-amber-400" />
            </div>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Link expired
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                This confirmation link has expired. Enter your email to get a new one.
              </p>
            </div>
            <div className="space-y-4 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="resend-email" className="text-sm font-medium text-gray-300">Email</Label>
                <input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
                  placeholder="Enter your email"
                />
              </div>
              <div ref={turnstileRef} />
              <Button
                onClick={handleResend}
                disabled={isSending || !resendEmail || !isReady || !turnstileToken}
                className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 font-medium rounded-lg transition-all duration-500"
              >
                <PaperPlaneTilt weight="bold" size={16} className="mr-2" />
                {isSending ? 'Sending...' : 'Resend confirmation'}
              </Button>
            </div>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
              <XCircle weight="duotone" size={32} className="text-red-400" />
            </div>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Invalid link
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                This confirmation link is not valid. It may have already been used.
              </p>
            </div>
          </>
        )}

        {status !== 'loading' && status !== 'success' && (
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
