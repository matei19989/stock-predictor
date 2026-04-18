import { toast as sonnerToast } from 'sonner';

const KEY = 'sp_notifications';

function enabled(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

type SonnerOpts<K extends keyof typeof sonnerToast> =
  typeof sonnerToast[K] extends (msg: string, opts?: infer O) => unknown ? O : never;

export const toast = {
  success: (msg: string, opts?: SonnerOpts<'success'>) =>
    enabled() ? sonnerToast.success(msg, opts) : undefined,
  error: (msg: string, opts?: SonnerOpts<'error'>) =>
    enabled() ? sonnerToast.error(msg, opts) : undefined,
  info: (msg: string, opts?: SonnerOpts<'info'>) =>
    enabled() ? sonnerToast.info(msg, opts) : undefined,
  message: (msg: string, opts?: SonnerOpts<'message'>) =>
    enabled() ? sonnerToast.message(msg, opts) : undefined,
  warning: (msg: string, opts?: SonnerOpts<'warning'>) =>
    enabled() ? sonnerToast.warning(msg, opts) : undefined,
};

// Re-export the raw sonner toast for the one call site that must bypass the gate
// (the toggle confirmation itself — so the user sees "Notifications disabled").
export { sonnerToast };
