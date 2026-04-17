import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SignalBadge from '../SignalBadge';
import type { TradingSignal } from '@/types';

describe('<SignalBadge />', () => {
  const signals: TradingSignal[] = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];

  it.each(signals)('renders the label for %s (md size)', (signal) => {
    render(<SignalBadge signal={signal} />);
    expect(screen.getByText(signal)).toBeInTheDocument();
  });

  it('renders em-dash when signal is null (md size)', () => {
    render(<SignalBadge signal={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders a coloured dot (no label) when size is sm and signal is present', () => {
    const { container } = render(<SignalBadge signal="Buy" size="sm" />);
    const dot = container.querySelector('div');
    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute('title', 'Buy');
    expect(screen.queryByText('Buy')).not.toBeInTheDocument();
  });

  it('renders a grey dot when size is sm and signal is null', () => {
    const { container } = render(<SignalBadge signal={null} size="sm" />);
    const dot = container.querySelector('div');
    expect(dot).toHaveAttribute('title', 'No signal');
  });

  it('uses larger typography classes when size is lg', () => {
    render(<SignalBadge signal="Strong Buy" size="lg" />);
    const badge = screen.getByText('Strong Buy');
    expect(badge.className).toContain('text-sm');
    expect(badge.className).toContain('font-semibold');
  });
});
