import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

interface UseTurnstileReturn {
  token: string | null;
  isReady: boolean;
  resetTurnstile: () => void;
}

export function useTurnstile(
  containerRef: RefObject<HTMLDivElement | null>,
  action: string
): UseTurnstileReturn {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const widgetIdRef = useRef<string | null>(null);

  const resetTurnstile = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Poll for the Turnstile script to be loaded (async defer)
    const interval = setInterval(() => {
      if (!window.turnstile) return;
      clearInterval(interval);

      const widgetId = window.turnstile.render(container, {
        sitekey: SITE_KEY,
        action,
        appearance: 'interaction-only',
        callback: (t: string) => {
          setToken(t);
          setIsReady(true);
        },
        'error-callback': () => {
          setToken(null);
        },
        'expired-callback': () => {
          setToken(null);
        },
      });

      widgetIdRef.current = widgetId;
      setIsReady(true);
    }, 100);

    return () => {
      clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      setIsReady(false);
      setToken(null);
    };
  }, [containerRef, action]);

  return { token, isReady, resetTurnstile };
}
