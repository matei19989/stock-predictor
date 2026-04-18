import { toast } from '@/lib/toast';

/** Wraps toast.success — suppressed when user disables notifications in Settings. */
export function notifySuccess(message: string) {
  toast.success(message);
}
