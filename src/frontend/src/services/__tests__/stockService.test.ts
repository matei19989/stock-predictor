import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '../api';
import * as stockService from '../stockService';

describe('stockService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('search GETs /api/stocks/search with the q query param', async () => {
    mock.onGet('/api/stocks/search').reply(200, [
      { ticker: 'AAPL', name: 'Apple', sector: 'Tech', latestClose: 200, isInWatchlist: true },
    ]);

    const res = await stockService.search('aapl');

    expect(res).toHaveLength(1);
    expect(res[0].ticker).toBe('AAPL');
    expect(mock.history.get[0].params).toEqual({ q: 'aapl' });
  });

  it('getDetail GETs /api/stocks/:ticker', async () => {
    mock.onGet('/api/stocks/MSFT').reply(200, {
      ticker: 'MSFT',
      name: 'Microsoft',
      sector: 'Tech',
      lastUpdatedAt: '2026-04-18',
      prices: [],
    });

    const res = await stockService.getDetail('MSFT');

    expect(res.ticker).toBe('MSFT');
    expect(mock.history.get[0].url).toBe('/api/stocks/MSFT');
  });

  it('getAll GETs /api/stocks and returns the list', async () => {
    mock.onGet('/api/stocks').reply(200, [
      { ticker: 'AAPL', name: 'Apple', sector: 'Tech', latestClose: 200, change1dPct: 1.2, latestSignal: 'Buy', signalConfidence: 0.4 },
    ]);

    const res = await stockService.getAll();

    expect(res).toHaveLength(1);
    expect(res[0].latestSignal).toBe('Buy');
  });

  it('recordVisit POSTs /api/stocks/:ticker/visit with no body', async () => {
    mock.onPost('/api/stocks/AAPL/visit').reply(204);

    await stockService.recordVisit('AAPL');

    expect(mock.history.post[0].url).toBe('/api/stocks/AAPL/visit');
  });

  it('getRecentlyViewed GETs /api/stocks/recently-viewed', async () => {
    mock.onGet('/api/stocks/recently-viewed').reply(200, [
      { ticker: 'AAPL', name: 'Apple' },
      { ticker: 'MSFT', name: null },
    ]);

    const res = await stockService.getRecentlyViewed();

    expect(res).toHaveLength(2);
    expect(res[1].name).toBeNull();
  });
});
