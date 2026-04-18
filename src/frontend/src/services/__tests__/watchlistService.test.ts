import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '../api';
import * as watchlistService from '../watchlistService';

describe('watchlistService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('getAll GETs /api/watchlist', async () => {
    mock.onGet('/api/watchlist').reply(200, [
      {
        ticker: 'AAPL',
        name: 'Apple',
        latestClose: 200,
        previousClose: 198,
        change1dPct: 1.01,
        addedAt: '2026-04-18',
        latestSignal: 'Buy',
        signalConfidence: 0.4,
      },
    ]);

    const res = await watchlistService.getAll();

    expect(res).toHaveLength(1);
    expect(res[0].ticker).toBe('AAPL');
  });

  it('add POSTs { ticker } to /api/watchlist', async () => {
    mock.onPost('/api/watchlist').reply(201);

    await watchlistService.add('AAPL');

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ ticker: 'AAPL' });
  });

  it('remove DELETEs /api/watchlist/:ticker', async () => {
    mock.onDelete('/api/watchlist/AAPL').reply(204);

    await watchlistService.remove('AAPL');

    expect(mock.history.delete[0].url).toBe('/api/watchlist/AAPL');
  });
});
