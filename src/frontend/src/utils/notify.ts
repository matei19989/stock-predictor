import { toast } from 'sonner';

/** Wraps toast.success — suppressed when user disables notifications in Settings. */
export function notifySuccess(message: string) {
  if (localStorage.getItem('sp_notifications') === 'false') return;
  toast.success(message);
}
