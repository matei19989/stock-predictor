import { useRef, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { EnvelopeSimple, ArrowLeft, PaperPlaneTilt } from '@phosphor-icons/react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useTurnstile } from '@/hooks/useTurnstile';
import { resendConfirmation } from '@/services/authService';

export default function ConfirmPendingPage() {
  useDocumentTitle('Check Your Email');
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { maskedEmail?: string; rawEmail?: string } | null;
  const maskedEmail = state?.maskedEmail;
  const rawEmail = state?.rawEmail;

  const turnstileRef = useRef<HTMLDivElement>(null);
  const { token: turnstileToken, isReady, resetTurnstile } = useTurnstile(turnstileRef, 'resend');

  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!maskedEmail || !rawEmail) navigate('/register', { replace: true });
  }, [maskedEmail, rawEmail, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!turnstileToken || !rawEmail) return;
    setIsSending(true);
    try {
      await resendConfirmation(rawEmail, turnstileToken);
      toast.success('Confirmation email resent.');
      setCooldown(60);
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setIsSending(false);
      resetTurnstile();
    }
  }, [turnstileToken, rawEmail, resetTurnstile]);

  if (!maskedEmail || !rawEmail) return null;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#07080d] px-6">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/[0.07] rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] text-center space-y-8 animate-slide-up">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <EnvelopeSimple weight="duotone" size={32} className="text-purple-400" />
        </div>

        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Check your email
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            We sent a confirmation link to{' '}
            <span className="text-gray-300 font-medium">{maskedEmail}</span>.
            <br />
            Click the link to activate your account. It expires in 1 hour.
          </p>
        </div>

        <div className="space-y-4">
          <div ref={turnstileRef} />
          <Button
            onClick={handleResend}
            disabled={isSending || cooldown > 0 || !isReady || !turnstileToken}
            variant="outline"
            className="w-full h-11 border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-all duration-300"
          >
            <PaperPlaneTilt weight="bold" size={16} className="mr-2" />
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : isSending
                ? 'Sending...'
                : 'Resend confirmation email'}
          </Button>
        </div>

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
