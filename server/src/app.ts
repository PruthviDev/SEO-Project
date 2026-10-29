/**
 * Express Application & API Routes for AuditPulse
 */

import express, { Request, Response } from 'express';
import { AuthenticatedRequest, authenticateToken, createSessionToken } from './auth.ts';
import { assertSafeUrl, crawlSite, normalizeUrl } from './crawler.ts';
import { initDb } from './db.ts';
import {
  ProviderApiError,
  ProviderAuthError,
  ProviderBillingError,
  ProviderNotConfiguredError,
  ProviderRateLimitError,
} from './integrations/dataforseo.ts';
import { getDomainTraffic } from './services/traffic.ts';

export const app = express();
app.use(express.json());

// Initialize database
initDb().catch((err) => {
  console.error('Failed to initialize database on startup:', err);
});

/**
 * Health check
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'AuditPulse API', time: new Date().toISOString() });
});

/**
 * Session / Demo Token Generation
 */
app.post('/api/auth/demo', (_req: Request, res: Response) => {
  const token = createSessionToken({
    id: 'usr_demo',
    email: 'demo@auditpulse.io',
    role: 'user',
  });
  res.json({
    token,
    user: { id: 'usr_demo', email: 'demo@auditpulse.io', role: 'user' },
  });
});

/**
 * Get current authenticated user
 */
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

/**
 * SEO Crawler Endpoint
 * Runs site audit without calling DataForSEO to protect budget
 */
app.post('/api/seo/crawl', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    const crawlResult = await crawlSite(url);
    res.json(crawlResult);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Crawl failed' });
  }
});

/**
 * DataForSEO Live Organic Traffic Endpoint
 * Requires authentication, URL safety check, caching, and rate limiting.
 */
app.get('/api/seo/traffic', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const rawUrl = req.query.url as string;
  if (!rawUrl) {
    res.status(400).json({ error: 'Query parameter "url" is required' });
    return;
  }

  try {
    // 1. Validate URL & extract domain
    assertSafeUrl(rawUrl);
    const { domain } = normalizeUrl(rawUrl);

    const locationCode = req.query.location_code
      ? parseInt(req.query.location_code as string, 10)
      : 2840;
    const languageCode = (req.query.language_code as string) || 'en';

    // 2. Fetch traffic data with caching, limit guard, and error classification
    const traffic = await getDomainTraffic(
      domain,
      locationCode,
      languageCode,
      req.user?.id || 'usr_anonymous'
    );

    res.json(traffic);
  } catch (err: any) {
    if (err instanceof ProviderNotConfiguredError) {
      res.status(503).json({
        error: 'Traffic provider not configured',
        details: 'DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be configured on the server.',
      });
      return;
    }

    if (err instanceof ProviderAuthError) {
      res.status(502).json({
        error: 'Upstream provider authentication failed',
        details: 'DataForSEO API credentials rejected by provider.',
      });
      return;
    }

    if (err instanceof ProviderBillingError) {
      res.status(503).json({
        error: 'Traffic provider account balance or cost limit exceeded.',
      });
      return;
    }

    if (err instanceof ProviderRateLimitError) {
      res.status(429).json({
        error: 'Upstream provider rate limit exceeded. Please wait a moment and try again.',
      });
      return;
    }

    if (err.statusCode === 429 || err.name === 'UsageLimitExceededError' || err.name === 'BudgetExceededError') {
      res.status(429).json({
        error: err.message,
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    if (err instanceof ProviderApiError) {
      res.status(err.statusCode || 502).json({
        error: err.message,
        providerCode: err.providerCode,
      });
      return;
    }

    res.status(400).json({
      error: err.message || 'Failed to retrieve traffic data',
    });
  }
});
