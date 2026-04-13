import { Outlet } from 'react-router';
import { WatchlistProvider } from '@/contexts/WatchlistContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function AppLayout() {
  return (
    <WatchlistProvider>
      <div className="relative flex h-screen flex-col overflow-hidden bg-[#07080d]">
        {/* Ambient background glows */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute -top-[200px] left-1/4 w-[600px] h-[400px] bg-purple-600/[0.04] rounded-full blur-[180px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[350px] bg-teal-500/[0.03] rounded-full blur-[160px]" />
          <div className="absolute top-1/2 -left-[100px] w-[350px] h-[350px] bg-pink-500/[0.02] rounded-full blur-[140px]" />
        </div>

        {/* Noise texture */}
        <div className="pointer-events-none fixed inset-0 z-[60] opacity-[0.025]">
          <svg width="100%" height="100%">
            <filter id="app-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#app-grain)" />
          </svg>
        </div>

        <Navbar />
        <div className="relative z-10 flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-8">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </WatchlistProvider>
  );
}
