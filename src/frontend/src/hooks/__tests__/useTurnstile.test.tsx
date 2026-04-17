import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { useTurnstile } from '../useTurnstile';

interface RenderParams {
  sitekey: string;
  action: string;
  appearance: string;
  callback: (token: string) => void;
  'error-callback': () => void;
  'expired-callback': () => void;
}

describe('useTurnstile', () => {
  let lastRenderParams: RenderParams | null = null;
  const renderMock = vi.fn((_el: HTMLElement, params: RenderParams) => {
    lastRenderParams = params;
    return 'widget-id-1';
  });
  const resetMock = vi.fn();
  const removeMock = vi.fn();

  beforeEach(() => {
    lastRenderParams = null;
    renderMock.mockClear();
    resetMock.mockClear();
    removeMock.mockClear();

    (window as unknown as { turnstile: unknown }).turnstile = {
      render: renderMock,
      reset: resetMock,
      remove: removeMock,
    };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as { turnstile?: unknown }).turnstile;
  });

  it('renders the widget and captures the token when the callback fires', () => {
    const container = document.createElement('div');
    const ref = createRef<HTMLDivElement>();
    (ref as { current: HTMLDivElement | null }).current = container;

    const { result } = renderHook(() => useTurnstile(ref, 'login'));

    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(lastRenderParams?.action).toBe('login');

    act(() => {
      lastRenderParams?.callback('token-abc');
    });

    expect(result.current.token).toBe('token-abc');
    expect(result.current.isReady).toBe(true);
  });

  it('resetTurnstile clears the token and resets the widget', () => {
    const ref = createRef<HTMLDivElement>();
    (ref as { current: HTMLDivElement | null }).current = document.createElement('div');

    const { result } = renderHook(() => useTurnstile(ref, 'register'));
    act(() => {
      vi.advanceTimersByTime(120);
    });
    act(() => {
      lastRenderParams?.callback('token-1');
    });
    expect(result.current.token).toBe('token-1');

    act(() => {
      result.current.resetTurnstile();
    });

    expect(result.current.token).toBeNull();
    expect(resetMock).toHaveBeenCalledWith('widget-id-1');
  });

  it('clears the token when expired-callback fires', () => {
    const ref = createRef<HTMLDivElement>();
    (ref as { current: HTMLDivElement | null }).current = document.createElement('div');

    const { result } = renderHook(() => useTurnstile(ref, 'login'));
    act(() => {
      vi.advanceTimersByTime(120);
    });
    act(() => {
      lastRenderParams?.callback('token-1');
    });
    expect(result.current.token).toBe('token-1');

    act(() => {
      lastRenderParams?.['expired-callback']();
    });

    expect(result.current.token).toBeNull();
  });

  it('removes the widget on unmount', () => {
    const ref = createRef<HTMLDivElement>();
    (ref as { current: HTMLDivElement | null }).current = document.createElement('div');

    const { unmount } = renderHook(() => useTurnstile(ref, 'login'));
    act(() => {
      vi.advanceTimersByTime(120);
    });

    unmount();

    expect(removeMock).toHaveBeenCalledWith('widget-id-1');
  });
});
