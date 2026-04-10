import type { TradingSignal, Horizon } from '@/types';

export const SIGNAL_COLORS: Record<TradingSignal, string> = {
  'Strong Buy':  'bg-emerald-500 text-white',
  'Buy':         'bg-green-500 text-white',
  'Hold':        'bg-amber-500 text-white',
  'Sell':        'bg-orange-500 text-white',
  'Strong Sell': 'bg-red-500 text-white',
};

export const SIGNAL_DOT_COLORS: Record<TradingSignal, string> = {
  'Strong Buy':  'bg-emerald-500',
  'Buy':         'bg-green-500',
  'Hold':        'bg-amber-500',
  'Sell':        'bg-orange-500',
  'Strong Sell': 'bg-red-500',
};

export const SIGNAL_ORDER: TradingSignal[] = [
  'Strong Buy',
  'Buy',
  'Hold',
  'Sell',
  'Strong Sell',
];

export const HORIZON_LABELS: Record<Horizon, string> = {
  '3m': '3 Months',
  '6m': '6 Months',
  '1y': '1 Year',
};

export const TOKEN_KEY = 'sp_token';
export const USER_KEY = 'sp_user';
export const SIDEBAR_KEY = 'sp_sidebar';
