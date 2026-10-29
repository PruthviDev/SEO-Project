/**
 * Caching & Request Deduplication Helper for DataForSEO
 * Computes sha256 of endpoint + stable JSON, enforces in-flight deduplication,
 * guards daily limits and records response costs.
 */

import crypto from 'crypto';
import {
  checkAndRecordUsage,
  getProviderCache,
  setProviderCache,
} from '../db.ts';

// In-memory map for deduplicating concurrent identical requests
const inFlightMap = new Map<string, Promise<{ result: any; cost: number; fromCache: boolean }>>();

/**
 * Deterministic JSON stringify with sorted keys
 */
export function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

/**
 * Generates sha256 cache key from endpoint and stable JSON body
 */
export function computeCacheKey(endpoint: string, body: unknown): string {
  const normalizedEndpoint = endpoint.trim().toLowerCase();
  const stablePayload = stableStringify(body);
  return crypto.createHash('sha256').update(`${normalizedEndpoint}:${stablePayload}`).digest('hex');
}

/**
 * Executes a DataForSEO operation with caching, concurrency deduplication, and budget protection.
 *
 * - Cache hits: returned immediately, 0 cost, NO usage counts deducted.
 * - Cache miss: checks user and global budget limits before invoking fetcher,
 *   stores response, records cost, and updates provider usage.
 */
export async function withCache<T>(
  cacheKey: string,
  endpoint: string,
  ttlSeconds: number,
  userId: string,
  fetcher: () => Promise<{ result: T; cost: number }>
): Promise<{ result: T; cost: number; fromCache: boolean }> {
  // Deduplicate concurrent identical requests
  if (inFlightMap.has(cacheKey)) {
    return (await inFlightMap.get(cacheKey)!) as { result: T; cost: number; fromCache: boolean };
  }

  const executionPromise = (async () => {
    // 1. Check persistent cache (PostgreSQL / JSON fallback)
    const cachedData = await getProviderCache(cacheKey);
    if (cachedData !== null) {
      return {
        result: cachedData as T,
        cost: 0,
        fromCache: true,
      };
    }

    // 2. Cache miss: Enforce rate/budget limit BEFORE invoking the billable API
    await checkAndRecordUsage(userId);

    // 3. Invoke paid provider call
    const { result, cost } = await fetcher();

    // 4. Save to persistent cache with TTL
    await setProviderCache(cacheKey, endpoint, result, ttlSeconds);

    // 5. Record billable usage and cost
    await checkAndRecordUsage(userId, cost);

    return {
      result,
      cost,
      fromCache: false,
    };
  })();

  inFlightMap.set(cacheKey, executionPromise);

  try {
    return await executionPromise;
  } finally {
    inFlightMap.delete(cacheKey);
  }
}
