import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '../api';
import * as predictionService from '../predictionService';

const samplePrediction = {
  ticker: 'AAPL',
  horizon: '3m',
  signal: 'Buy',
  confidence: 0.42,
  probabilities: { 'Strong Sell': 0.1, Sell: 0.1, Hold: 0.2, Buy: 0.42, 'Strong Buy': 0.18 },
  featuresUsed: 22,
  lowConfidence: false,
  cachedAt: '2026-04-18T00:00:00Z',
  expiresAt: '2026-04-19T00:00:00Z',
};

describe('predictionService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('create POSTs { ticker, horizon } to /api/predictions and returns the prediction', async () => {
    mock.onPost('/api/predictions').reply(200, samplePrediction);

    const res = await predictionService.create({ ticker: 'AAPL', horizon: '3m' });

    expect(res.signal).toBe('Buy');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ ticker: 'AAPL', horizon: '3m' });
  });

  it('getLatest GETs /api/predictions/:ticker with horizon query param', async () => {
    mock.onGet('/api/predictions/MSFT').reply(200, { ...samplePrediction, ticker: 'MSFT', horizon: '6m' });

    const res = await predictionService.getLatest('MSFT', '6m');

    expect(res?.horizon).toBe('6m');
    expect(mock.history.get[0].params).toEqual({ horizon: '6m' });
  });

  it('getLatest defaults horizon to "3m" when not specified', async () => {
    mock.onGet('/api/predictions/AAPL').reply(404, { status: 404, title: 'NotFound', detail: '' });

    await predictionService.getLatest('AAPL');

    expect(mock.history.get[0].params).toEqual({ horizon: '3m' });
  });

  it('getLatest returns null (not an error) when the backend returns 404', async () => {
    mock.onGet('/api/predictions/NOPE').reply(404, {
      status: 404,
      title: 'NotFound',
      detail: 'No prediction cached for NOPE',
    });

    const res = await predictionService.getLatest('NOPE');

    expect(res).toBeNull();
  });

  it('getLatest re-throws non-404 errors (e.g. 503) so callers can surface them', async () => {
    mock.onGet('/api/predictions/X').reply(503, {
      status: 503,
      title: 'ServiceUnavailable',
      detail: 'ML down',
    });

    await expect(predictionService.getLatest('X')).rejects.toMatchObject({
      name: 'ApiException',
      status: 503,
    });
  });

  it('getUserPredictionCount unwraps the { count } envelope', async () => {
    mock.onGet('/api/predictions/user/count').reply(200, { count: 17 });

    const res = await predictionService.getUserPredictionCount();

    expect(res).toBe(17);
  });

  it('getUserPredicted returns the array straight from the backend', async () => {
    const list = [
      {
        ticker: 'AAPL',
        name: 'Apple',
        horizon: '3m',
        signal: 'Buy',
        confidence: 0.4,
        predictedAt: '2026-04-18T00:00:00Z',
        expiresAt: '2026-04-19T00:00:00Z',
        isExpired: false,
      },
    ];
    mock.onGet('/api/predictions/user/predicted').reply(200, list);

    const res = await predictionService.getUserPredicted();

    expect(res).toEqual(list);
  });
});
