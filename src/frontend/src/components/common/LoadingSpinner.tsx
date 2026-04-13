import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
} as const;

export default function LoadingSpinner({ fullPage = false, size = 'md' }: LoadingSpinnerProps) {
  const spinner = (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'animate-spin rounded-full border-white/[0.08] border-t-purple-500',
        sizeClasses[size]
      )}
    />
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080d]">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-600/[0.06] rounded-full blur-[120px] pointer-events-none" />
        <div className="relative">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
}
