import { Link } from 'react-router';
import RegisterForm from '@/components/auth/RegisterForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import chartVideo from '@/assets/chart-video.mp4';

export default function RegisterPage() {
  useDocumentTitle('Create Account');
  return (
    <div className="flex min-h-[100dvh] bg-[#07080d]">
      {/* ── Left panel: form ────────────────────────────── */}
      <div className="relative flex w-full flex-col justify-between px-8 py-8 lg:w-[45%] lg:px-16 xl:px-24 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/[0.07] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-[50px] -left-[100px] w-[350px] h-[350px] bg-teal-500/[0.04] rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute top-[70%] -right-[100px] w-[300px] h-[300px] bg-pink-500/[0.03] rounded-full blur-[130px] pointer-events-none" />

        {/* Noise overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]">
          <svg width="100%" height="100%">
            <filter id="register-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#register-grain)" />
          </svg>
        </div>

        {/* Logo — top */}
        <div className="relative z-10">
          <Link to="/" className="inline-block">
            <h1 className="font-heading text-xl font-bold tracking-[-0.03em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Grafynt
            </h1>
          </Link>
        </div>

        {/* Form — center */}
        <div className="relative z-10 w-full max-w-[400px] mx-auto animate-slide-up">
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 className="font-heading text-3xl font-bold tracking-[-0.03em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Get started
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Create your account and start trading smarter
              </p>
            </div>
            <RegisterForm />
          </div>
        </div>

        {/* Spacer — bottom (keeps vertical centering) */}
        <div className="relative z-10" />
      </div>

      {/* ── Right panel: video ──────────────────────────── */}
      <div className="relative hidden lg:block lg:w-[55%] p-3 pl-0">
        <div className="relative h-full w-full overflow-hidden rounded-2xl">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            src={chartVideo}
          />
          {/* Left-edge gradient blend into the form panel */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#07080d]/60 to-transparent" />
          {/* Subtle top/bottom vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#07080d]/30 via-transparent to-[#07080d]/40" />
        </div>
      </div>
    </div>
  );
}
