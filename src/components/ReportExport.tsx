/**
 * AuditPulse - SEO & Traffic Report Export
 * Printable and exportable report view that handles optional traffic data gracefully.
 */

import React from 'react';
import { Printer, Download, CheckCircle2, AlertTriangle, XCircle, Globe, Shield } from 'lucide-react';
import { CrawlResult } from '../types/seo.ts';

interface ReportExportProps {
  result: CrawlResult;
  onClose?: () => void;
}

export const ReportExport: React.FC<ReportExportProps> = ({ result, onClose }) => {
  const { url, domain, score, issues, summary, crawledAt, traffic } = result;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-4xl mx-auto text-slate-100">
      {/* Action Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6 print:hidden">
        <div>
          <h3 className="text-lg font-bold text-white">SEO Audit Executive Summary</h3>
          <p className="text-xs text-slate-400">Printable client-ready report</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition shadow-lg shadow-blue-600/20"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" /> AuditPulse SEO Intelligence
            </div>
            <h2 className="text-2xl font-black text-white">{domain}</h2>
            <p className="text-xs text-slate-400 break-all">{url}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold text-white">{score}/100</div>
            <p className="text-xs text-slate-400">SEO Health Index</p>
            <p className="text-[11px] text-slate-500 mt-1">Audit Date: {new Date(crawledAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Audit Metrics Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800">
            <span className="text-xs text-rose-400 font-medium">Critical Errors</span>
            <div className="text-xl font-bold text-white mt-1">{summary.criticalCount}</div>
          </div>
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800">
            <span className="text-xs text-amber-400 font-medium">Warnings</span>
            <div className="text-xl font-bold text-white mt-1">{summary.warningCount}</div>
          </div>
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800">
            <span className="text-xs text-blue-400 font-medium">Recommendations</span>
            <div className="text-xl font-bold text-white mt-1">{summary.noticeCount}</div>
          </div>
        </div>

        {/* Traffic Section in Report */}
        <div className="p-5 bg-slate-800/30 rounded-xl border border-slate-800">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            Organic Search & Traffic Data
          </h4>
          {traffic ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Data source: <span className="text-slate-200 font-medium">DataForSEO API</span> (retrieved {new Date(traffic.fetchedAt).toLocaleString()})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-3 bg-slate-900 rounded-lg">
                  <div className="text-xs text-slate-400">Organic Visits (ETV)</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {traffic.estimatedMonthlyOrganicTraffic.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg">
                  <div className="text-xs text-slate-400">Ranked Keywords</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {traffic.rankedKeywordsCount.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg">
                  <div className="text-xs text-slate-400">Total Backlinks</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {traffic.backlinks.total.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg">
                  <div className="text-xs text-slate-400">Referring Domains</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {traffic.backlinks.referringDomains.toLocaleString()}
                  </div>
                </div>
              </div>

              {traffic.topKeywords.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-semibold text-slate-300">Key Ranking Terms:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {traffic.topKeywords.slice(0, 8).map((kw, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-md text-xs text-slate-200">
                        {kw.keyword} <strong className="text-blue-400">#{kw.position}</strong> (Vol: {kw.volume.toLocaleString()})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">
              Organic traffic metrics were not retrieved for this scan. Traffic data is queried separately on demand via DataForSEO.
            </div>
          )}
        </div>

        {/* Priority Issues Table */}
        <div>
          <h4 className="text-sm font-bold text-white mb-3">Actionable Improvements</h4>
          <div className="space-y-2">
            {issues.slice(0, 10).map((issue, idx) => (
              <div key={idx} className="p-3 bg-slate-800/40 rounded-lg border border-slate-800 flex items-start gap-3 text-xs">
                {issue.severity === 'error' ? (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : issue.severity === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-200">{issue.title}</div>
                  <div className="text-slate-400 mt-0.5">{issue.description}</div>
                  <div className="text-emerald-400 font-medium mt-1">Recommendation: {issue.recommendation}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
