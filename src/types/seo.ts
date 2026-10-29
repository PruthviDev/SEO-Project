/**
 * AuditPulse SEO Audit & Traffic Types
 */

export interface TopKeyword {
  keyword: string;
  position: number;
  volume: number;
  difficulty: number;
  /** Traffic share percentage (0 - 100), computed from estimated keyword traffic (ETV) vs total */
  trafficShare: number;
}

export interface TrafficTrend {
  date: string;
  organic: number;
}

export interface BacklinksSummary {
  total: number;
  referringDomains: number;
  rank: number;
}

export interface TrafficData {
  dataSource: 'dataforseo';
  location: string;
  fetchedAt: string;
  fromCache: boolean;
  estimatedMonthlyOrganicTraffic: number;
  rankedKeywordsCount: number;
  topKeywords: TopKeyword[];
  trends: TrafficTrend[];
  backlinks: BacklinksSummary;

  // Optional and intentionally left unset because DataForSEO API does not provide real on-site analytics
  uniqueVisitors?: number;
  avgDuration?: string | number;
  bounceRate?: number;
  pagesPerVisit?: number;
  deviceBreakdown?: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  topCountries?: Array<{
    country: string;
    share: number;
  }>;
  sources?: Array<{
    source: string;
    share: number;
  }>;
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface SeoIssue {
  id: string;
  severity: IssueSeverity;
  category: 'Meta & Content' | 'Performance' | 'Indexing' | 'Links & Media' | 'Security';
  title: string;
  description: string;
  recommendation: string;
  impactScore: number;
  url?: string;
}

export interface PageAudit {
  url: string;
  status: number;
  title: string;
  description: string;
  h1: string[];
  h2: string[];
  canonicalUrl?: string;
  loadTimeMs: number;
  wordCount: number;
  internalLinksCount: number;
  externalLinksCount: number;
  missingAltImagesCount: number;
  issues: SeoIssue[];
}

export interface CrawlResult {
  id: string;
  url: string;
  domain: string;
  crawledAt: string;
  score: number;
  totalPagesCrawled: number;
  pages: PageAudit[];
  issues: SeoIssue[];
  summary: {
    criticalCount: number;
    warningCount: number;
    noticeCount: number;
    avgLoadTimeMs: number;
  };
  /**
   * Note: traffic is optional. It is NOT fetched during crawl to prevent unnecessary API billing.
   * Fetched on demand when the user visits the Traffic tab.
   */
  traffic?: TrafficData;
}

export interface AuditProject {
  id: string;
  userId: string;
  domain: string;
  url: string;
  lastCrawlScore: number;
  createdAt: string;
  updatedAt: string;
  lastCrawlResult?: CrawlResult;
}
