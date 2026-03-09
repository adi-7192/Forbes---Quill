"use client";

import { useState, useEffect } from "react";
import { OutputCard } from "./OutputCard";
import { SkeletonLoader } from "./SkeletonLoader";
import { HistoryItem } from "@/hooks/useHistory";
import { PenLine, RefreshCcw } from "lucide-react";
import { trackGenerationStart, trackGenerationComplete } from "@/lib/analytics";

interface ResearchResponse {
  keyDataPoints: string;
  priorCoverage: string;
  storyQuestions: string;
  suggestedSources: string;
  rssSuccess?: boolean;
  prompt_version?: string;
}

interface ResearchFormProps {
  onSuccess: (query: string, data: ResearchResponse) => void;
  loadedHistory: HistoryItem | null;
  onClearHistory: () => void;
  onDraftGenerated: (draft: string, safetyFlags?: any) => void;
}

export function ResearchForm({ onSuccess, loadedHistory, onClearHistory, onDraftGenerated }: ResearchFormProps) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("Technology");
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResponse | null>(null);

  useEffect(() => {
    if (loadedHistory && loadedHistory.type === "research") {
      setQuery(loadedHistory.query);
      setResult(loadedHistory.data as ResearchResponse);
      setError(null);
    }
  }, [loadedHistory]);

  const handleNewSearch = () => {
    onClearHistory();
    setQuery("");
    setResult(null);
    setError(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    onClearHistory();
    setLoading(true);
    setError(null);
    setResult(null);
    
    trackGenerationStart('research');

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, section }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate research brief");
      }

      const data = await res.json();
      setResult(data);
      onSuccess(query, data);
      trackGenerationComplete('research', undefined, undefined, undefined, data.prompt_version);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!result || !query) return;

    setDrafting(true);
    setError(null);
    
    trackGenerationStart('draft');

    try {
      const res = await fetch("/api/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, researchData: result }),
      });

      if (!res.ok) {
        throw new Error("Failed to draft article");
      }

      const data = await res.json();
      
      // We pass 0 for forbiddenWordCount for now, we'd calculate styleScore based on flags if we wanted.
      // E.g. penalty for flags. Just setting dummy style scores or logic.
      const wordCount = data.metadata?.word_count || 0;
      const flagsCount = data.safetyFlags?.flags?.length || 0;
      
      trackGenerationComplete('draft', wordCount, data.forbidden_words || [], flagsCount === 0 ? 100 : Math.max(0, 100 - (flagsCount * 10)), data.prompt_version);
      
      onDraftGenerated(data.draft, data.safetyFlags);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to draft article");
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Research Brief</h2>
        {(result || query) && (
          <button
            onClick={handleNewSearch}
            className="text-sm flex items-center gap-1.5 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm transition-all active:scale-95"
          >
            <RefreshCcw size={14} /> New Search
          </button>
        )}
      </div>

      <div className="mb-8 p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="angle" className="block text-sm font-semibold text-gray-900">
              Story angle or headline
            </label>
            {loadedHistory && (
              <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-md">
                Viewing Historical Data
              </span>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-colors text-gray-900 text-sm font-medium"
              disabled={loading || drafting}
            >
              <option value="Technology">Technology</option>
              <option value="Leadership">Leadership</option>
              <option value="Finance">Finance</option>
              <option value="Entrepreneurs">Entrepreneurs</option>
              <option value="Innovation">Innovation</option>
            </select>
            <input
              id="angle"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. The impact of AI on commercial real estate"
              className="flex-1 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-colors text-gray-900 text-sm"
              disabled={loading || drafting}
              required
            />
            <button
              type="submit"
              disabled={loading || drafting || !query.trim()}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap active:scale-[0.98]"
            >
              {loading ? "Generating..." : "Generate Brief"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}
        </form>
      </div>

      {loading && (
        <div className="space-y-4">
          <SkeletonLoader />
          <SkeletonLoader />
          <SkeletonLoader />
          <SkeletonLoader />
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-500 pb-20">
          <div className={`text-sm font-medium px-4 py-2.5 rounded-md inline-flex items-center gap-2 mb-2 ${result.rssSuccess ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
            {result.rssSuccess ? "✓ Checked recent Forbes coverage" : "⚠ Could not load recent coverage — proceed carefully"}
          </div>
          <OutputCard title="Key Data Points" content={String(result.keyDataPoints || "")} requiresVerification={true} moduleId="research" outputId="key_data" onRegenerate={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} />
          <OutputCard title="Prior Coverage" content={String(result.priorCoverage || "")} moduleId="research" outputId="prior_coverage" onRegenerate={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} />
          <OutputCard title="Story Questions" content={String(result.storyQuestions || "")} moduleId="research" outputId="story_questions" onRegenerate={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} />
          <OutputCard title="Suggested Sources" content={String(result.suggestedSources || "")} requiresVerification={true} moduleId="research" outputId="suggested_sources" onRegenerate={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} />

          <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to write?</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md leading-relaxed">
              Use Gemini 2.5 Pro to automatically draft a 500-800 word article based on the brief data above, then proceed to SEO and Distribution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <button
                onClick={handleGenerateDraft}
                disabled={drafting}
                className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {drafting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Drafting Article...
                  </>
                ) : (
                  <>
                    <PenLine size={17} /> Generate Article Draft
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
