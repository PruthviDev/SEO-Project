/**
 * AuditPulse - Live Traffic & Keywords Dashboard
 * Powered by DataForSEO API (Live endpoints: domain_rank_overview, ranked_keywords,
 * historical_rank_overview, backlinks/summary).
 * Displays real organic traffic data only. Never fabricates numbers.
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Search,
  Link2,
  Database,
  Clock,
  AlertTriangle,
  RefreshCw,
  Lock,
  Layers,
  Award,
  Globe,
  ExternalLink,
  Info
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrafficData } from '../types/seo.ts';

interface TrafficDashboardProps {
  url: string;
  domain: string;
}

export const TrafficDashboard: React.FC<TrafficDashboardProps> = ({ url, domain }) => {
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [status429, setStatus429] = useState<boolean>(false);
  const [status503, setStatus503] = useState<boolean>(false);
  const [unauthenticated, setUnauthenticated] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('auditpulse_token'));

  // Quick demo sign-in helper
  const handleQuickSignIn = async () => {
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('auditpulse_token', data.token);
        setToken(data.token);
        setUnauthenticated(false);
      }
    } catch (err: any) {
      console.error('Demo auth failed:', err);
    }
  };

  const fetchTrafficData = async () => {
    if (!domain) return;

    const currentToken = sessionStorage.getItem('auditpulse_token');
    if (!currentToken) {
      setUnauthenticated(true);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setStatus429(false);
    setStatus503(false);
    setUnauthenticated(false);

    try {
      const res = await fetch(`/api/seo/traffic?url=${encodeURIComponent(url || domain)}`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (res.status === 401) {
        setUnauthenticated(true);
        setLoading(false);
        return;
      }

      if (res.status === 429) {
        setStatus429(true);
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Usage limit exceeded. You have reached your daily DataForSEO call limit or budget.');
        setLoading(false);
        return;
      }

      if (res.status === 503) {
        setStatus503(true);
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Traffic provider not configured');
        setErrorDetails(data.details || 'DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be configured in server/.env');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed to fetch traffic data (HTTP ${res.status})`);
        setErrorDetails(data.details || null);
        setLoading(false);
        return;
      }

      const data: TrafficData = await res.json();
      setTraffic(data);
    } catch (err: any) {
      setError(err.message || 'Network error fetching traffic metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrafficData();
  }, [domain, token]);

  // Format numbers nicely
  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // 1. Sign-in required state
  if (unauthenticated) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center max-w-2xl mx-auto my-8 backdrop-blur-sm">
        <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Authentication Required</h3>
        <p className="text-slate-400 mb-6 text-sm leading-relaxed">
          Accessing live DataForSEO organic traffic and keyword metrics requires an authenticated session to protect API usage budgets.
        </p>
        <button
          onClick={handleQuickSignIn}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <Award className="w-4 h-4" />
          Sign In with Active Session
        </button>
      </div>
    );
  }

  // 2. Loading state
  if (loading) {
    return (
      <div className="space-y-6 py-6 animate-pulse">
        <div className="h-12 bg-slate-800/60 rounded-xl w-3/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-slate-800/40 rounded-2xl"></div>
          <div className="h-32 bg-slate-800/40 rounded-2xl"></div>
          <div className="h-32 bg-slate-800/40 rounded-2xl"></div>
        </div>
        <div className="h-72 bg-slate-800/30 rounded-2xl"></div>
        <div className="h-64 bg-slate-800/30 rounded-2xl"></div>
      </div>
    );
  }

  // 3. 503 Provider Not Configured state
  if (status503) {
    return (
      <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-8 max-w-2xl mx-auto my-6 text-amber-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white mb-1">Traffic Provider Not Configured</h4>
            <p className="text-sm text-slate-300 mb-3">{error}</p>
            {errorDetails && (
              <p className="text-xs text-amber-300 font-mono bg-amber-950/40 p-2.5 rounded-lg border border-amber-800/50 mb-4">
                {errorDetails}
              </p>
            )}
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              To enable live organic data, provide <code className="text-amber-300">DATAFORSEO_LOGIN</code> and <code className="text-amber-300">DATAFORSEO_PASSWORD</code> in <code className="text-amber-300">server/.env</code>. When testing without cost, set <code className="text-amber-300">DATAFORSEO_SANDBOX=true</code>.
            </p>
            <button
              onClick={fetchTrafficData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. 429 Rate/Budget Limit Exceeded state
  if (status429) {
    return (
      <div className="bg-rose-950/20 border border-rose-800/40 rounded-2xl p-8 max-w-2xl mx-auto my-6 text-rose-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white mb-1">Usage Limit Reached (HTTP 429)</h4>
            <p className="text-sm text-slate-300 mb-2">{error}</p>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Daily quota protections are active (configured via DFS_DAILY_CALLS_PER_USER and DFS_DAILY_BUDGET_USD). Quotas reset at midnight UTC. Cache hits continue to be accessible without counting toward limits.
            </p>
            <button
              onClick={fetchTrafficData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition"
            >
              <RefreshCw className="w-4 h-4" /> Recheck
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Generic Error state
  if (error) {
    return (
      <div className="bg-slate-900/80 border border-red-900/50 rounded-2xl p-8 max-w-2xl mx-auto my-6 text-slate-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white mb-1">Could Not Retrieve Live Traffic</h4>
            <p className="text-sm text-red-300 mb-2">{error}</p>
            {errorDetails && <p className="text-xs text-slate-400 font-mono mb-4">{errorDetails}</p>}
            <button
              onClick={fetchTrafficData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If no traffic data loaded yet
  if (!traffic) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>No traffic data available. Click below to load live metrics for {domain}.</p>
        <button
          onClick={fetchTrafficData}
          className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 transition inline-flex items-center gap-2"
        >
          <Search className="w-4 h-4" /> Fetch Live Traffic
        </button>
      </div>
    );
  }

  const { estimatedMonthlyOrganicTraffic, rankedKeywordsCount, backlinks, topKeywords, trends } = traffic;

  return (
    <div className="space-y-6">
      {/* Disclaimer and Metadata Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse" />
          <span className="font-semibold text-slate-200">
            Estimated organic traffic from DataForSEO
          </span>
          <span className="text-slate-500 hidden md:inline">• (not actual site analytics)</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {traffic.fromCache ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium">
              <Database className="w-3.5 h-3.5" /> Cached (7-day TTL)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-medium">
              <Globe className="w-3.5 h-3.5" /> Live DataForSEO API
            </span>
          )}

          <span className="text-slate-400">
            Fetched: {new Date(traffic.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          <button
            onClick={fetchTrafficData}
            title="Refresh traffic data"
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary KPI Cards (Real Data Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estimated Organic Traffic */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Organic Visits (ETV)</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(estimatedMonthlyOrganicTraffic)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Monthly estimated search traffic</p>
        </div>

        {/* Ranked Keywords */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ranked Keywords</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Search className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(rankedKeywordsCount)}
          </div>
          <p className="text-xs text-slate-500 mt-1">In Google top 100 SERPs</p>
        </div>

        {/* Total Backlinks */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Backlinks</span>
            <div className="p-2 bg-violet-500/10 text-violet-400 rounded-xl">
              <Link2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(backlinks?.total ?? 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            from {formatNumber(backlinks?.referringDomains ?? 0)} referring domains
          </p>
        </div>

        {/* Domain Authority / Rank */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Domain Authority</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {backlinks?.rank ?? 0}
            <span className="text-xs text-slate-500 font-normal ml-1">/ 1000</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">DataForSEO link score</p>
        </div>
      </div>

      {/* Historical Monthly Organic Trend (Rendered only if trends exist) */}
      {trends && trends.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Monthly Organic Traffic Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Retrospective estimated organic visits (ETV) over time
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="organicGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? val : d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
                  }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => formatNumber(val)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [formatNumber(Number(val) || 0), 'Estimated Organic Visits']}
                  labelFormatter={(lbl) => `Snapshot Date: ${lbl}`}
                />
                <Area
                  type="monotone"
                  dataKey="organic"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#organicGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Ranked Keywords Table (Real data only) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" />
              Top Ranked Keywords
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live SERP positions, search volume, difficulty, and estimated traffic contribution
            </p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 self-start">
            Showing top {topKeywords.length} keywords
          </span>
        </div>

        {topKeywords.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No keywords found in top 100 organic search positions for this domain.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                  <th className="pb-3 font-semibold">Keyword</th>
                  <th className="pb-3 font-semibold text-center">Rank</th>
                  <th className="pb-3 font-semibold text-right">Search Volume</th>
                  <th className="pb-3 font-semibold text-center">Difficulty</th>
                  <th className="pb-3 font-semibold text-right">Traffic Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topKeywords.map((item, idx) => (
                  <tr key={`${item.keyword}-${idx}`} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{item.keyword}</span>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(item.keyword)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="View on Google"
                          className="text-slate-500 hover:text-slate-300"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.position <= 3
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.position <= 10
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        #{item.position}
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-slate-300 font-mono text-xs">
                      {formatNumber(item.volume)}/mo
                    </td>
                    <td className="py-3.5 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.difficulty > 70
                                ? 'bg-rose-500'
                                : item.difficulty > 40
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, item.difficulty)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-mono w-6 text-right">
                          {item.difficulty}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-medium text-slate-200 font-mono text-xs">
                      {item.trafficShare > 0 ? `${item.trafficShare.toFixed(1)}%` : '< 0.1%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Honest Note on Unset Fields */}
      <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl text-xs text-slate-500 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold text-slate-400">Notice on Web Analytics:</span> AuditPulse strictly avoids
          fabricating simulated metrics. On-site analytics (such as bounce rates, average session durations, and exact device breakdowns)
          cannot be provided by search engine rank databases and are honestly omitted.
        </p>
      </div>
    </div>
  );
};
