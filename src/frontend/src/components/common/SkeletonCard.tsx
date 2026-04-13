import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export default function SkeletonCard({ lines = 3, className }: SkeletonCardProps) {
  return (
    <div className={cn('space-y-2.5 p-4', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4 rounded-md bg-white/[0.04]',
            i === 0 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}
