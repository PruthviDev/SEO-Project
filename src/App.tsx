/**
 * AuditPulse - Main Application
 * Modern SEO Audit Tool with Live DataForSEO Traffic Integration
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Search,
  FileText,
  Printer,
  Globe,
  Lock,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Database,
  Layers
} from 'lucide-react';
import { TrafficDashboard } from './components/TrafficDashboard.tsx';
import { Visualizer } from './components/Visualizer.tsx';
import { ReportExport } from './components/ReportExport.tsx';
import { CrawlResult } from './types/seo.ts';

export default function App() {
  const [targetUrl, setTargetUrl] = useState<string>('https://dataforseo.com');
  const [activeTab, setActiveTab] = useState<'overview' | 'traffic' | 'pages' | 'report'>('overview');
  const [crawling, setCrawling] = useState<boolean>(false);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => sessionStorage.getItem('auditpulse_token'));

  // Ensure default demo token on first load if none set
  useEffect(() => {
    if (!sessionStorage.getItem('auditpulse_token')) {
      fetch('/api/auth/demo', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          if (data?.token) {
            sessionStorage.setItem('auditpulse_token', data.token);
            setAuthToken(data.token);
          }
        })
        .catch((err) => console.warn('Could not auto-generate demo token:', err));
    }
  }, []);

  // Initial audit run for default target URL
  useEffect(() => {
    runAudit(targetUrl);
  }, []);

  const runAudit = async (urlToCrawl: string) => {
    if (!urlToCrawl.trim()) return;

    setCrawling(true);
    setCrawlError(null);

    try {
      const res = await fetch('/api/seo/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToCrawl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Crawl failed with status ${res.status}`);
      }

      const result: CrawlResult = await res.json();
      setCrawlResult(result);
    } catch (err: any) {
      setCrawlError(err.message || 'Failed to crawl target website');
    } finally {
      setCrawling(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runAudit(targetUrl);
  };

  const quickSamples = ['dataforseo.com', 'stripe.com', 'github.com', 'wikipedia.org'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">AuditPulse</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  SEO Suite
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Crawl Diagnostics & DataForSEO Live Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>DataForSEO Engine</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>

            {authToken ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Authenticated Session</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  fetch('/api/auth/demo', { method: 'POST' })
                    .then((r) => r.json())
                    .then((d) => {
                      sessionStorage.setItem('auditpulse_token', d.token);
                      setAuthToken(d.token);
                    });
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
              >
                Sign In (Demo)
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search & Audit Hero Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="Enter website URL (e.g., https://example.com)"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={crawling}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {crawling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Auditing Site...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Audit Website</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Domain Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
              <span className="text-slate-500 font-medium">Quick samples:</span>
              {quickSamples.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setTargetUrl(`https://${sample}`);
                    runAudit(`https://${sample}`);
                  }}
                  className="px-2.5 py-1 bg-slate-800/60 hover:bg-slate-800 hover:text-slate-200 rounded-lg border border-slate-800 text-slate-400 transition"
                >
                  {sample}
                </button>
              ))}
            </div>
          </form>

          {crawlError && (
            <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <span>{crawlError}</span>
            </div>
          )}
        </div>

        {/* View Tabs */}
        {crawlResult && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    activeTab === 'overview'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Audit Overview
                </button>

                <button
                  onClick={() => setActiveTab('traffic')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    activeTab === 'traffic'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Live Organic Traffic
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20 animate-pulse" />
                </button>

                <button
                  onClick={() => setActiveTab('pages')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    activeTab === 'pages'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Page Hierarchy & Tags
                </button>

                <button
                  onClick={() => setActiveTab('report')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    activeTab === 'report'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  Executive Report
                </button>
              </div>

              <div className="text-xs text-slate-400">
                Target: <span className="font-semibold text-slate-200">{crawlResult.domain}</span>
              </div>
            </div>

            {/* Tab 1: Overview & Visualizer */}
            {activeTab === 'overview' && (
              <Visualizer
                result={crawlResult}
                onOpenTrafficTab={() => setActiveTab('traffic')}
              />
            )}

            {/* Tab 2: DataForSEO Live Organic Traffic Dashboard */}
            {activeTab === 'traffic' && (
              <TrafficDashboard
                url={crawlResult.url}
                domain={crawlResult.domain}
              />
            )}

            {/* Tab 3: Detailed Page Hierarchy & HTML Tags */}
            {activeTab === 'pages' && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Audited Page Details & Structural Hierarchy
                </h3>

                {crawlResult.pages.map((page, idx) => (
                  <div key={idx} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                      <div>
                        <span className="text-xs font-mono text-blue-400">{page.url}</span>
                        <h4 className="text-base font-semibold text-white mt-1">{page.title || '(No Title)'}</h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded bg-slate-800 font-mono text-slate-300">
                          Status {page.status}
                        </span>
                        <span className="px-2.5 py-1 rounded bg-slate-800 font-mono text-slate-300">
                          {page.loadTimeMs}ms
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Meta Description:</span>
                        <p className="text-slate-200 mt-1 bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
                          {page.description || 'Missing meta description'}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-medium">Canonical Tag:</span>
                        <p className="text-slate-200 mt-1 bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 font-mono text-[11px]">
                          {page.canonicalUrl || 'No canonical tag found'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 font-medium">H1 Headings:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {page.h1.length > 0 ? (
                          page.h1.map((h, hIdx) => (
                            <span key={hIdx} className="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-200">
                              {h}
                            </span>
                          ))
                        ) : (
                          <span className="text-rose-400 text-xs italic">Missing H1 tag</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center text-xs">
                      <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block">Word Count</span>
                        <span className="text-sm font-bold text-white mt-0.5 block">{page.wordCount}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block">Internal Links</span>
                        <span className="text-sm font-bold text-white mt-0.5 block">{page.internalLinksCount}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block">External Links</span>
                        <span className="text-sm font-bold text-white mt-0.5 block">{page.externalLinksCount}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block">Missing Alt Images</span>
                        <span className="text-sm font-bold text-amber-400 mt-0.5 block">{page.missingAltImagesCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Executive Report Export */}
            {activeTab === 'report' && (
              <ReportExport result={crawlResult} />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 mt-12 bg-slate-950 text-xs text-slate-500 text-center">
        <p>AuditPulse SEO Intelligence • Integrated with DataForSEO Live Organic Search APIs</p>
      </footer>
    </div>
  );
}
