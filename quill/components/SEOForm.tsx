"use client";

import { useState, useEffect } from "react";
import { OutputCard } from "./OutputCard";
import { SkeletonLoader } from "./SkeletonLoader";
import { HistoryItem } from "@/hooks/useHistory";
import { RefreshCcw, ArrowRight, CheckCircle } from "lucide-react";
import { trackGenerationStart, trackGenerationComplete } from "@/lib/analytics";

interface SEOResponse {
  primary_headline: string;
  seo_headline: string;
  meta_description: string;
  primary_keyword: string;
  secondary_keywords: string[];
  tags: string[];
  section: string;
  estimated_read_time_mins: number;
  word_count: number;
}

interface SEOFormProps {
  onSuccess: (draft: string, data: SEOResponse) => void;
  loadedHistory: HistoryItem | null;
  onClearHistory: () => void;
  incomingDraft?: string;
  incomingSafetyFlags?: any;
  onNextTab?: () => void;
}

export function SEOForm({ onSuccess, loadedHistory, onClearHistory, incomingDraft, incomingSafetyFlags, onNextTab }: SEOFormProps) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SEOResponse | null>(null);

  // Auto-fill from cross-tab drafted articles
  useEffect(() => {
    if (incomingDraft && incomingDraft !== draft) {
      setDraft(incomingDraft);
      onClearHistory(); 
      setResult(null); // Clear SEO results so user can generate fresh ones for the new draft
    }
  }, [incomingDraft, draft, onClearHistory]);

  // Sync loaded history into state when selected from sidebar
  useEffect(() => {
    if (loadedHistory && loadedHistory.type === "seo") {
      setDraft(loadedHistory.query);
      setResult(loadedHistory.data as SEOResponse);
      setError(null);
    }
  }, [loadedHistory]);

  const handleNewSearch = () => {
    onClearHistory();
    setDraft("");
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;

    onClearHistory();
    setLoading(true);
    setError(null);
    setResult(null);

    trackGenerationStart('seo');

    try {
      const res = await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate SEO metadata");
      }

      const data = await res.json();
      setResult(data);
      onSuccess(draft, data); 
      trackGenerationComplete('seo', data.word_count, data.forbidden_words || [], undefined, data.prompt_version);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">SEO Metadata</h2>
        {(result || draft) && (
          <button
            onClick={handleNewSearch}
            className="text-sm flex items-center gap-1.5 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm transition-all active:scale-95"
          >
            <RefreshCcw size={14} /> New Draft
          </button>
        )}
      </div>

      <div className="mb-8 p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="draft" className="block text-sm font-semibold text-gray-900">
              Paste article draft
            </label>
            {loadedHistory && (
              <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-md">
                Viewing Historical Data
              </span>
            )}
          </div>
          
          <div className="flex flex-col gap-4">
            {incomingSafetyFlags?.requires_verification && incomingSafetyFlags.flags && incomingSafetyFlags.flags.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 text-amber-800 font-bold mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  SAFETY VERIFICATION REQUIRED
                </div>
                <div className="text-sm text-amber-900 mb-2">
                  The generated draft contains the following claims that must be verified by an editor before publication:
                </div>
                <ul className="space-y-3">
                  {incomingSafetyFlags.flags.map((flag: any, idx: number) => (
                    <li key={idx} className="bg-white p-3 rounded-md border border-amber-100 shadow-sm">
                      <div className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">{flag.type.replace('_', ' ')}</div>
                      <div className="text-[13px] font-medium text-gray-900 leading-snug">"{flag.text_snippet}"</div>
                      <div className="text-[13px] text-gray-500 mt-1 italic">Reason: {flag.reason}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <textarea
              id="draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Start pasting your draft here..."
              className="w-full h-48 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-colors text-gray-900 text-sm resize-y leading-relaxed"
              disabled={loading}
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !draft.trim()}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {loading ? "Generating..." : "Generate SEO Metadata"}
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
        </form>
      </div>

      {loading && (
        <div className="space-y-4">
          <SkeletonLoader />
          <SkeletonLoader />
          <SkeletonLoader />
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-500 pb-20">
          <div className="flex items-center gap-2 mb-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-100 animate-in zoom-in duration-300">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">SEO Meta successfully generated for your draft.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OutputCard title="Primary Headline" content={String(result.primary_headline || "")} moduleId="seo" outputId="primary_headline" onRegenerate={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} />
            <OutputCard title="SEO Headline" content={String(result.seo_headline || "")} moduleId="seo" outputId="seo_headline" onRegenerate={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} />
          </div>

          <OutputCard title="Meta Description" content={String(result.meta_description || "")} moduleId="seo" outputId="meta_description" onRegenerate={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OutputCard title="Primary Keyword" content={String(result.primary_keyword || "")} moduleId="seo" outputId="primary_keyword" onRegenerate={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} />
            <OutputCard 
              title="Secondary Keywords" 
              content={Array.isArray(result.secondary_keywords) ? result.secondary_keywords.join(", ") : String(result.secondary_keywords || "None")} 
              moduleId="seo" outputId="secondary_keywords" onRegenerate={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Section</span>
              <span className="text-sm font-medium text-gray-900">{String(result.section || "N/A")}</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Read Time</span>
              <span className="text-sm font-medium text-gray-900">{result.estimated_read_time_mins || 0} mins</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Word Count</span>
              <span className="text-sm font-medium text-gray-900">{result.word_count || 0} words</span>
            </div>
          </div>

          <OutputCard 
            title="Tags" 
            content={Array.isArray(result.tags) ? result.tags.join(", ") : String(result.tags || "None")} 
            moduleId="seo" outputId="tags" onRegenerate={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          />

          <div className="mt-8 pt-8 border-t border-gray-100 flex justify-center">
            <button
              onClick={onNextTab}
              className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 shadow-md transition-all active:scale-[0.98] group"
            >
              Proceed to Distribution Hub
              <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
