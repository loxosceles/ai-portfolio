import { jest } from '@jest/globals';
import { generateExpiryFormats } from '../../lib/functions/link-generator/index.mjs';

describe('Link Generator Lambda - generateExpiryFormats', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('should generate TTL and linkExpiry representing the same date', () => {
    const mockNow = new Date('2025-01-01T12:30:45.000Z');
    const mockFuture15days = new Date('2025-01-16T12:30:45.000Z');

    jest.useFakeTimers({ now: mockNow.getTime() });

    const result = generateExpiryFormats(15);

    expect(result.ttl).toBe(Math.floor(mockFuture15days.getTime() / 1000));
    expect(result.linkExpiry).toBe(mockFuture15days.toISOString());
  });
});
