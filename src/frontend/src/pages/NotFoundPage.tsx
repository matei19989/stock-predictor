import { Link } from 'react-router';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page Not Found');
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-[#07080d]">
      {/* Background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/[0.06] rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-pink-500/[0.04] rounded-full blur-[140px] pointer-events-none" />

      {/* Noise */}
      <div className="pointer-events-none fixed inset-0 z-[60] opacity-[0.03]">
        <svg width="100%" height="100%">
          <filter id="notfound-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#notfound-grain)" />
        </svg>
      </div>

      <div className="relative z-10 text-center space-y-4 animate-slide-up">
        <h1 className="font-heading text-[120px] font-bold tracking-[-0.06em] leading-none bg-gradient-to-b from-white/20 to-white/5 bg-clip-text text-transparent">
          404
        </h1>
        <p className="text-lg text-gray-500 font-light">Page not found</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors duration-300"
        >
          Go home →
        </Link>
      </div>
    </div>
  );
}
