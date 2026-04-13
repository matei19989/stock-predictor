import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center animate-slide-up">
      {icon && <div className="text-3xl text-gray-600">{icon}</div>}
      <div className="space-y-2">
        <h3 className="font-heading text-lg font-semibold tracking-[-0.02em]">{title}</h3>
        <p className="max-w-sm text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button
          variant="outline"
          onClick={onAction}
          className="mt-2 rounded-xl border-white/[0.08] hover:bg-white/[0.06]"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
