/**
 * AuditPulse - Visualizer Component
 * Visualizes SEO crawl metrics, issue severities, page performance,
 * and handles optional/missing traffic data honestly without hardcoded dummy strings.
 */

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { CrawlResult } from '../types/seo.ts';

interface VisualizerProps {
  result: CrawlResult;
  onOpenTrafficTab?: () => void;
}

export const Visualizer: React.FC<VisualizerProps> = ({ result, onOpenTrafficTab }) => {
  const { score, summary, issues, pages, domain, traffic } = result;

  const getScoreColor = (s: number) => {
    if (s >= 85) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (s >= 70) return 'text-blue-400 border-blue-500/40 bg-blue-500/10';
    if (s >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 85) return 'Excellent Health';
    if (s >= 70) return 'Good Condition';
    if (s >= 50) return 'Needs Improvement';
    return 'Critical SEO Issues';
  };

  return (
    <div className="space-y-6">
      {/* Top Health Overview & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Gauge Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <div className="relative mb-4 flex items-center justify-center">
            <div
              className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center shadow-lg ${getScoreColor(
                score
              )}`}
            >
              <span className="text-4xl font-extrabold tracking-tight text-white">{score}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">out of 100</span>
            </div>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">{getScoreLabel(score)}</h3>
          <p className="text-xs text-slate-400 max-w-xs">
            Overall crawl score evaluating metadata, heading hierarchy, load speed, and accessibility.
          </p>
        </div>

        {/* Issues Severity Breakdown */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Audit Issue Severity
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <div className="flex items-center gap-2.5">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-sm font-medium text-rose-200">Critical Errors</span>
                </div>
                <span className="text-sm font-bold text-rose-300 font-mono">
                  {summary.criticalCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-200">Warnings</span>
                </div>
                <span className="text-sm font-bold text-amber-300 font-mono">
                  {summary.warningCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-200">Notices / Recommendations</span>
                </div>
                <span className="text-sm font-bold text-blue-300 font-mono">
                  {summary.noticeCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Speed & Structure Summary */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Crawl Diagnostics
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs text-slate-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Response Time
                </span>
                <span className="text-xs font-mono font-medium text-slate-200">
                  {summary.avgLoadTimeMs} ms
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs text-slate-400 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Pages Audited
                </span>
                <span className="text-xs font-mono font-medium text-slate-200">
                  {pages.length} URL
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Word Count (Home)</span>
                <span className="text-xs font-mono font-medium text-slate-200">
                  {pages[0]?.wordCount ? `${pages[0].wordCount.toLocaleString()} words` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Crawled at: {new Date(result.crawledAt).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Traffic Section: Handles Present vs Missing Traffic Data Honestly */}
      {traffic ? (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Live Organic Traffic Overview
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Estimated metrics provided by DataForSEO (cached {traffic.fromCache ? 'true' : 'false'})
              </p>
            </div>
            {onOpenTrafficTab && (
              <button
                onClick={onOpenTrafficTab}
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Open detailed keyword rankings <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Estimated Organic Visits</span>
              <div className="text-xl font-bold text-white mt-1">
                {traffic.estimatedMonthlyOrganicTraffic.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Ranked Keywords</span>
              <div className="text-xl font-bold text-white mt-1">
                {traffic.rankedKeywordsCount.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Domain Backlinks</span>
              <div className="text-xl font-bold text-white mt-1">
                {traffic.backlinks.total.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Live Organic Traffic & Keywords</h4>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                Traffic data is fetched on-demand to conserve DataForSEO API call quotas and costs.
                Switch to the Live Traffic tab to pull real organic search volume and keyword rankings.
              </p>
            </div>
          </div>
          {onOpenTrafficTab && (
            <button
              onClick={onOpenTrafficTab}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
            >
              View Live Traffic <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Issues List */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4">Detected SEO Audit Findings</h3>
        {issues.length === 0 ? (
          <div className="py-8 text-center text-emerald-400 text-sm">
            No critical issues detected! Your site structure adheres to core SEO best practices.
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        issue.severity === 'error'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : issue.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="text-xs font-medium text-slate-400">{issue.category}</span>
                  </div>
                  <h5 className="text-sm font-semibold text-slate-200">{issue.title}</h5>
                  <p className="text-xs text-slate-400">{issue.description}</p>
                  <p className="text-xs text-emerald-400 font-medium pt-1">
                    Fix: {issue.recommendation}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Impact: -{issue.impactScore} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
