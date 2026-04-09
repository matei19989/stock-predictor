import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export default function SkeletonCard({ lines = 3, className }: SkeletonCardProps) {
  return (
    <div className={cn('space-y-2 p-4', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={i === 0 ? 'h-4 w-3/4' : 'h-4 w-full'} />
      ))}
    </div>
  );
}
