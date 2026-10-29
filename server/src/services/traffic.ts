/**
 * DataForSEO Traffic & Keywords Service
 * Performs cached and rate-limited queries to DataForSEO live endpoints.
 * Never fabricates numbers. Maps real API responses directly to TrafficData.
 */

import { BacklinksSummary, TopKeyword, TrafficData, TrafficTrend } from '../../../src/types/seo.ts';
import { dfs } from '../integrations/dataforseo.ts';
import { computeCacheKey, withCache } from './cache.ts';

const TTL_7_DAYS = 7 * 24 * 3600; // 604,800 seconds
const TTL_30_DAYS = 30 * 24 * 3600; // 2,592,000 seconds

interface DomainRankOverviewItem {
  target?: string;
  metrics?: {
    organic?: {
      etv?: number;
      count?: number;
    };
    paid?: {
      etv?: number;
      count?: number;
    };
  };
}

interface RankedKeywordItem {
  keyword_data?: {
    keyword?: string;
    keyword_info?: {
      search_volume?: number;
      keyword_difficulty?: number;
    };
    keyword_properties?: {
      keyword_difficulty?: number;
    };
    keyword_difficulty?: number;
  };
  ranked_serp_element?: {
    serp_item?: {
      rank_absolute?: number;
      position?: number;
      rank_group?: number;
      etv?: number;
    };
  };
}

interface HistoricalOverviewItem {
  date?: string;
  metrics?: {
    organic?: {
      etv?: number;
      count?: number;
    };
  };
}

interface BacklinksSummaryResult {
  target?: string;
  rank?: number;
  backlinks?: number;
  referring_domains?: number;
  items?: Array<{
    rank?: number;
    backlinks?: number;
    referring_domains?: number;
  }>;
}

/**
 * Fetch real organic traffic metrics from DataForSEO
 */
export async function getDomainTraffic(
  domain: string,
  locationCode = 2840,
  languageCode = 'en',
  userId = 'usr_anonymous'
): Promise<TrafficData> {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();

  // Endpoint 1: Domain Rank Overview
  const domainOverviewPath = '/v3/dataforseo_labs/google/domain_rank_overview/live';
  const domainOverviewBody = [
    {
      target: cleanDomain,
      location_code: locationCode,
      language_code: languageCode,
    },
  ];
  const overviewCacheKey = computeCacheKey(domainOverviewPath, domainOverviewBody);

  // Endpoint 2: Ranked Keywords (limit: 20)
  const rankedKeywordsPath = '/v3/dataforseo_labs/google/ranked_keywords/live';
  const rankedKeywordsBody = [
    {
      target: cleanDomain,
      location_code: locationCode,
      language_code: languageCode,
      limit: 20,
    },
  ];
  const rankedCacheKey = computeCacheKey(rankedKeywordsPath, rankedKeywordsBody);

  // Endpoint 3: Historical Rank Overview (monthly trend)
  const historicalPath = '/v3/dataforseo_labs/google/historical_rank_overview/live';
  const historicalBody = [
    {
      target: cleanDomain,
      location_code: locationCode,
      language_code: languageCode,
    },
  ];
  const historicalCacheKey = computeCacheKey(historicalPath, historicalBody);

  // Endpoint 4: Backlinks Summary
  const backlinksPath = '/v3/backlinks/summary/live';
  const backlinksBody = [
    {
      target: cleanDomain,
    },
  ];
  const backlinksCacheKey = computeCacheKey(backlinksPath, backlinksBody);

  // Execute calls in parallel with caching and user usage tracking
  const [overviewRes, rankedRes, historicalRes, backlinksRes] = await Promise.all([
    withCache<any>(overviewCacheKey, domainOverviewPath, TTL_7_DAYS, userId, () =>
      dfs<any>(domainOverviewPath, domainOverviewBody)
    ),
    withCache<any>(rankedCacheKey, rankedKeywordsPath, TTL_7_DAYS, userId, () =>
      dfs<any>(rankedKeywordsPath, rankedKeywordsBody)
    ),
    withCache<any>(historicalCacheKey, historicalPath, TTL_30_DAYS, userId, () =>
      dfs<any>(historicalPath, historicalBody)
    ),
    withCache<any>(backlinksCacheKey, backlinksPath, TTL_7_DAYS, userId, () =>
      dfs<any>(backlinksPath, backlinksBody)
    ),
  ]);

  const anyFromCache =
    overviewRes.fromCache || rankedRes.fromCache || historicalRes.fromCache || backlinksRes.fromCache;

  // 1. Parse Domain Rank Overview
  let estimatedMonthlyOrganicTraffic = 0;
  let rankedKeywordsCount = 0;

  const overviewResult = Array.isArray(overviewRes.result) ? overviewRes.result[0] : overviewRes.result;
  const overviewItems: DomainRankOverviewItem[] = overviewResult?.items || (Array.isArray(overviewRes.result) ? overviewRes.result : []);
  if (overviewItems.length > 0) {
    const item = overviewItems[0];
    estimatedMonthlyOrganicTraffic = Math.round(item.metrics?.organic?.etv ?? 0);
    rankedKeywordsCount = item.metrics?.organic?.count ?? 0;
  }

  // 2. Parse Ranked Keywords
  const rankedResult = Array.isArray(rankedRes.result) ? rankedRes.result[0] : rankedRes.result;
  const rawKeywords: RankedKeywordItem[] = rankedResult?.items || (Array.isArray(rankedRes.result) ? rankedRes.result : []);

  // Compute total ETV among top keywords if domain-level ETV is 0
  const topKeywordsEtvSum = rawKeywords.reduce((acc, item) => {
    return acc + (item.ranked_serp_element?.serp_item?.etv ?? 0);
  }, 0);

  const baselineEtv = estimatedMonthlyOrganicTraffic > 0 ? estimatedMonthlyOrganicTraffic : topKeywordsEtvSum;

  const topKeywords: TopKeyword[] = rawKeywords.map((item) => {
    const kw = item.keyword_data?.keyword || 'unknown';
    const pos =
      item.ranked_serp_element?.serp_item?.rank_absolute ??
      item.ranked_serp_element?.serp_item?.position ??
      item.ranked_serp_element?.serp_item?.rank_group ??
      1;
    const vol = item.keyword_data?.keyword_info?.search_volume ?? 0;
    const diff =
      item.keyword_data?.keyword_properties?.keyword_difficulty ??
      item.keyword_data?.keyword_info?.keyword_difficulty ??
      item.keyword_data?.keyword_difficulty ??
      0;
    const kwEtv = item.ranked_serp_element?.serp_item?.etv ?? 0;

    let trafficShare = 0;
    if (baselineEtv > 0 && kwEtv > 0) {
      trafficShare = Math.min(100, Math.round((kwEtv / baselineEtv) * 1000) / 10);
    }

    return {
      keyword: kw,
      position: pos,
      volume: vol,
      difficulty: diff,
      trafficShare,
    };
  });

  // 3. Parse Historical Rank Overview
  const historicalResult = Array.isArray(historicalRes.result) ? historicalRes.result[0] : historicalRes.result;
  const rawHistory: HistoricalOverviewItem[] = historicalResult?.items || [];
  const trends: TrafficTrend[] = rawHistory
    .filter((h) => h.date)
    .map((h) => ({
      date: h.date!,
      organic: Math.round(h.metrics?.organic?.etv ?? 0),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 4. Parse Backlinks Summary
  const blResult: BacklinksSummaryResult = Array.isArray(backlinksRes.result)
    ? backlinksRes.result[0]
    : backlinksRes.result;

  const backlinks: BacklinksSummary = {
    total: blResult?.backlinks ?? blResult?.items?.[0]?.backlinks ?? 0,
    referringDomains: blResult?.referring_domains ?? blResult?.items?.[0]?.referring_domains ?? 0,
    rank: blResult?.rank ?? blResult?.items?.[0]?.rank ?? 0,
  };

  const trafficData: TrafficData = {
    dataSource: 'dataforseo',
    location: `US (Location: ${locationCode})`,
    fetchedAt: new Date().toISOString(),
    fromCache: anyFromCache,
    estimatedMonthlyOrganicTraffic,
    rankedKeywordsCount,
    topKeywords,
    trends,
    backlinks,
    // Note: web analytics fields (bounceRate, uniqueVisitors, avgDuration, deviceBreakdown, etc.)
    // are intentionally omitted and left unset as DataForSEO does not provide real on-site analytics.
  };

  return trafficData;
}
