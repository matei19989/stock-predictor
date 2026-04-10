// Allows the axios interceptor to navigate without access to React hooks.
// Set by AuthContext on mount via setNavigate().

type NavigateFn = (to: string, options?: { replace?: boolean }) => void;

let _navigate: NavigateFn | null = null;

export function setNavigate(fn: NavigateFn): void {
  _navigate = fn;
}

export function navigateTo(to: string, options?: { replace?: boolean }): void {
  if (_navigate) {
    _navigate(to, options);
  } else {
    // Fallback before React Router has mounted
    window.location.href = to;
  }
}
