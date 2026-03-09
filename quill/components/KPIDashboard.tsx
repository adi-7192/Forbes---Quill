'use client';

import { useState, useEffect } from 'react';
import { getKPISummary, KPISummary } from '@/lib/analytics';
import { BarChart3, Clock, CheckCircle, RefreshCw, AlertTriangle, FileText, Download } from 'lucide-react';

export function KPIDashboard() {
  const [metrics, setMetrics] = useState<KPISummary | null>(null);

  useEffect(() => {
    // Load metrics on mount
    setMetrics(getKPISummary());
    
    // Periodically refresh in case it's left open while other tabs work
    const interval = setInterval(() => {
      setMetrics(getKPISummary());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return <div className="p-8 text-center text-gray-500">Loading metrics...</div>;
  }

  const handleExport = () => {
    const data = localStorage.getItem('quill_analytics_events');
    if (!data) return;
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-gray-400" size={24} />
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Editorial KPIs</h2>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-all active:scale-95"
        >
          <Download size={16} />
          Export Stats for Review
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        
        {/* Total Articles Drafted */}
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-colors">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <FileText size={18} />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Total Drafts</h3>
          </div>
          <div className="text-4xl font-bold text-gray-900">
            {metrics.total_articles_drafted}
          </div>
        </div>

        {/* Avg Time to Draft */}
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col justify-between group hover:border-gray-300 transition-colors">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <Clock size={18} />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Avg Time to Draft</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">{metrics.avg_time_to_draft_mins}</span>
            <span className="text-sm font-medium text-gray-500">mins</span>
          </div>
        </div>

        {/* Regeneration Rate */}
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col justify-between group hover:border-amber-200 transition-colors">
          <div className="flex items-center gap-2 mb-2 text-amber-600">
            <RefreshCw size={18} />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Regeneration Rate</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">{metrics.regeneration_rate}</span>
            <span className="text-sm font-medium text-gray-500">%</span>
          </div>
        </div>

        {/* Avg Style Score */}
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col justify-between group hover:border-green-200 transition-colors">
          <div className="flex items-center gap-2 mb-2 text-green-600">
            <CheckCircle size={18} />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Avg Style Score</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">{metrics.avg_style_score}</span>
            <span className="text-sm font-medium text-gray-500">/ 100</span>
          </div>
        </div>

        {/* Forbidden Word Violations */}
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col justify-between group hover:border-red-200 transition-colors lg:col-span-2">
          <div className="flex items-center gap-2 mb-2 text-red-600">
            <AlertTriangle size={18} />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Forbidden Word Violation Rate</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">{metrics.forbidden_word_violation_rate}</span>
            <span className="text-sm font-medium text-gray-500">% of drafts</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Percentage of articles flagged for violating brand style guides (e.g. using banned hype words).</p>
        </div>

      </div>
    </div>
  );
}
