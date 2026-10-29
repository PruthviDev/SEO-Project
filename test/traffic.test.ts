/**
 * Unit Tests for DataForSEO Integration, Caching, Limits, and Response Mapping
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  dfs,
  ProviderAuthError,
  ProviderBillingError,
  ProviderNotConfiguredError,
  ProviderRateLimitError,
} from '../server/src/integrations/dataforseo.ts';
import { withCache, computeCacheKey } from '../server/src/services/cache.ts';
import { getDomainTraffic } from '../server/src/services/traffic.ts';
import { UsageLimitExceededError, BudgetExceededError, checkAndRecordUsage } from '../server/src/db.ts';

describe('DataForSEO Integration & Traffic Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {
      ...originalEnv,
      DATAFORSEO_LOGIN: 'test_login',
      DATAFORSEO_PASSWORD: 'test_api_password',
      DATAFORSEO_SANDBOX: 'true',
      DFS_DAILY_CALLS_PER_USER: '30',
      DFS_DAILY_BUDGET_USD: '5',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // 1. Response Mapping Test
  it('maps DataForSEO live responses accurately to TrafficData without fabricating data', async () => {
    const mockOverviewResp = {
      version: '0.1.20261022',
      status_code: 20000,
      status_message: 'Ok.',
      cost: 0.02,
      tasks: [
        {
          id: 'task-1',
          status_code: 20000,
          status_message: 'Ok.',
          cost: 0.02,
          result: [
            {
              target: 'example.com',
              metrics: {
                organic: {
                  etv: 12500.45,
                  count: 420,
                },
              },
            },
          ],
        },
      ],
    };

    const mockRankedResp = {
      version: '0.1.20261022',
      status_code: 20000,
      status_message: 'Ok.',
      cost: 0.05,
      tasks: [
        {
          id: 'task-2',
          status_code: 20000,
          status_message: 'Ok.',
          cost: 0.05,
          result: [
            {
              items: [
                {
                  keyword_data: {
                    keyword: 'seo audit tools',
                    keyword_info: { search_volume: 1800 },
                    keyword_properties: { keyword_difficulty: 54 },
                  },
                  ranked_serp_element: {
                    serp_item: {
                      rank_absolute: 2,
                      etv: 1250,
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const mockHistoricalResp = {
      version: '0.1.20261022',
      status_code: 20000,
      status_message: 'Ok.',
      cost: 0.01,
      tasks: [
        {
          id: 'task-3',
          status_code: 20000,
          status_message: 'Ok.',
          cost: 0.01,
          result: [
            {
              items: [
                {
                  date: '2026-09-01',
                  metrics: { organic: { etv: 11000 } },
                },
                {
                  date: '2026-10-01',
                  metrics: { organic: { etv: 12500 } },
                },
              ],
            },
          ],
        },
      ],
    };

    const mockBacklinksResp = {
      version: '0.1.20261022',
      status_code: 20000,
      status_message: 'Ok.',
      cost: 0.02,
      tasks: [
        {
          id: 'task-4',
          status_code: 20000,
          status_message: 'Ok.',
          cost: 0.02,
          result: [
            {
              rank: 680,
              backlinks: 45000,
              referring_domains: 1200,
            },
          ],
        },
      ],
    };

    // Mock global fetch to return the corresponding endpoint payloads
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        let body: any = mockOverviewResp;
        if (url.includes('domain_rank_overview')) body = mockOverviewResp;
        else if (url.includes('ranked_keywords')) body = mockRankedResp;
        else if (url.includes('historical_rank_overview')) body = mockHistoricalResp;
        else if (url.includes('backlinks/summary')) body = mockBacklinksResp;

        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(body),
        });
      })
    );

    const traffic = await getDomainTraffic('example.com', 2840, 'en', 'usr_test_mapper');

    // Verify filled fields
    expect(traffic.dataSource).toBe('dataforseo');
    expect(traffic.estimatedMonthlyOrganicTraffic).toBe(12500);
    expect(traffic.rankedKeywordsCount).toBe(420);

    // Verify top keyword mapping & trafficShare calculation (1250 / 12500 * 100 = 10%)
    expect(traffic.topKeywords.length).toBe(1);
    expect(traffic.topKeywords[0].keyword).toBe('seo audit tools');
    expect(traffic.topKeywords[0].position).toBe(2);
    expect(traffic.topKeywords[0].volume).toBe(1800);
    expect(traffic.topKeywords[0].difficulty).toBe(54);
    expect(traffic.topKeywords[0].trafficShare).toBe(10);

    // Verify historical trends
    expect(traffic.trends.length).toBe(2);
    expect(traffic.trends[0].organic).toBe(11000);
    expect(traffic.trends[1].organic).toBe(12500);

    // Verify backlinks
    expect(traffic.backlinks.total).toBe(45000);
    expect(traffic.backlinks.referringDomains).toBe(1200);
    expect(traffic.backlinks.rank).toBe(680);

    // Verify optional analytics fields are omitted/undefined
    expect(traffic.bounceRate).toBeUndefined();
    expect(traffic.uniqueVisitors).toBeUndefined();
    expect(traffic.avgDuration).toBeUndefined();
    expect(traffic.deviceBreakdown).toBeUndefined();
  });

  // 2. Cache Hit vs Miss Test
  it('serves repeated requests from cache with 0 additional calls and fromCache flag set', async () => {
    let callCount = 0;
    const mockFetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      return { result: { sample: 'data_value' }, cost: 0.05 };
    });

    const cacheKey = computeCacheKey('/v3/test_endpoint', { target: `unique_test_${Date.now()}` });
    const userId = 'usr_cache_test';

    // 1st invocation: Cache Miss
    const missResult = await withCache<{ sample: string }>(cacheKey, '/v3/test_endpoint', 3600, userId, mockFetcher);
    expect(missResult.fromCache).toBe(false);
    expect(missResult.result.sample).toBe('data_value');
    expect(callCount).toBe(1);

    // 2nd invocation: Cache Hit
    const hitResult = await withCache<{ sample: string }>(cacheKey, '/v3/test_endpoint', 3600, userId, mockFetcher);
    expect(hitResult.fromCache).toBe(true);
    expect(hitResult.result.sample).toBe('data_value');
    // Fetcher must NOT have been called again
    expect(callCount).toBe(1);
  });

  // 3. Rate and Budget Limit Exceeded Tests
  it('enforces DFS_DAILY_CALLS_PER_USER limit and throws UsageLimitExceededError', async () => {
    process.env.DFS_DAILY_CALLS_PER_USER = '2';
    const userId = `usr_limit_${Date.now()}`;

    // Record 2 calls
    await checkAndRecordUsage(userId, 0.01);
    await checkAndRecordUsage(userId, 0.01);

    // Next pre-call check must throw
    await expect(checkAndRecordUsage(userId)).rejects.toThrow(UsageLimitExceededError);
  });

  it('enforces DFS_DAILY_BUDGET_USD global limit and throws BudgetExceededError', async () => {
    process.env.DFS_DAILY_BUDGET_USD = '0.05';
    const userId = `usr_budget_${Date.now()}`;

    // Record call exceeding 0.05 budget
    await checkAndRecordUsage(userId, 0.06);

    // Next pre-call check must throw BudgetExceededError
    await expect(checkAndRecordUsage(userId)).rejects.toThrow(BudgetExceededError);
  });

  // 4. Non-20000 Status Code Handling
  it('throws ProviderNotConfiguredError when credentials are missing', async () => {
    process.env.DATAFORSEO_LOGIN = '';
    process.env.DATAFORSEO_PASSWORD = '';

    await expect(dfs('/v3/any_endpoint', {})).rejects.toThrow(ProviderNotConfiguredError);
  });

  it('throws ProviderAuthError on 40100 status code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status_code: 40100,
            status_message: 'You are not authorized to access this resource.',
          }),
      })
    );

    await expect(dfs('/v3/any_endpoint', {})).rejects.toThrow(ProviderAuthError);
  });

  it('throws ProviderBillingError on 40203 cost limit exceeded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status_code: 40203,
            status_message: 'The cost limit has been exceeded.',
          }),
      })
    );

    await expect(dfs('/v3/any_endpoint', {})).rejects.toThrow(ProviderBillingError);
  });

  it('throws ProviderRateLimitError on 42900 rate limit code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status_code: 42900,
            status_message: 'The rate-limit per minute has been exceeded.',
          }),
      })
    );

    await expect(dfs('/v3/any_endpoint', {})).rejects.toThrow(ProviderRateLimitError);
  });
});
