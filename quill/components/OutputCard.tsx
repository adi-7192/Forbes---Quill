"use client";

import { useState } from "react";
import { Copy, Check, ThumbsUp, RefreshCw } from "lucide-react";
import { trackFeedback, ModuleType } from "@/lib/analytics";

interface OutputCardProps {
  title?: string;
  content: string;
  requiresVerification?: boolean;
  onFeedback?: (rating: 'positive' | 'negative') => void;
  moduleId?: ModuleType;
  outputId?: string;
  onRegenerate?: () => void;
}

export function OutputCard({ title, content, requiresVerification, onFeedback, moduleId, outputId, onRegenerate }: OutputCardProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackState, setFeedbackState] = useState<'none' | 'approved' | 'regenerated'>('none');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const handleApprove = async () => {
    setFeedbackState('approved');
    if (onFeedback) onFeedback('positive');
    if (moduleId && outputId) trackFeedback(moduleId, outputId, 'approved');
    
    // Auto-save to feedback store
    try {
      await fetch("/api/learning/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          article_text: content,
          rating: 'positive',
          metadata: { title }
        }),
      });
    } catch (err) {
      console.error("Failed to save positive feedback:", err);
    }
  };

  const handleRegenerate = () => {
    setFeedbackState('regenerated');
    if (moduleId && outputId) trackFeedback(moduleId, outputId, 'regenerated');
    if (onRegenerate) onRegenerate();
  };

  if (!content) return null;

  return (
    <div className={`relative p-6 bg-white border shadow-sm hover:shadow-md transition-all duration-200 rounded-xl mb-4 group ${
      requiresVerification ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'
    }`}>
      {requiresVerification && (
        <div className="absolute -top-3 left-6 px-3 py-1 bg-amber-100 border border-amber-200 rounded-full flex items-center gap-1.5 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Verification Required</span>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
        <div className="flex-1">
          {title && <h3 className="font-semibold text-lg tracking-tight text-gray-900">{title}</h3>}
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center justify-center p-1.5 rounded-md transition-all flex-shrink-0 ml-4
            ${copied 
              ? "bg-green-50 text-green-600" 
              : "text-gray-400 hover:text-gray-900 hover:bg-gray-100 opacity-0 group-hover:opacity-100 focus:opacity-100"
            }`}
          aria-label="Copy to clipboard"
          title="Copy"
        >
          {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} />}
        </button>
      </div>
      <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-gray-700 mb-4">
        {content}
      </div>

      <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-auto">Rate Module</span>
        
        {onRegenerate && (
          <button 
            onClick={handleRegenerate}
            disabled={feedbackState === 'regenerated'}
            className="text-xs flex items-center gap-1.5 text-gray-600 hover:text-amber-700 hover:bg-amber-50 px-2.5 py-1.5 rounded-md transition-all border border-gray-100 hover:border-amber-200"
          >
            <RefreshCw size={14} className={feedbackState === 'regenerated' ? "animate-spin" : ""} /> Regenerate
          </button>
        )}

        {feedbackState === 'approved' ? (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 rounded-md">
            <Check size={14} /> Approved
          </span>
        ) : (
          <button 
            onClick={handleApprove}
            className="text-xs flex items-center gap-1.5 text-gray-600 hover:text-green-700 hover:bg-green-50 px-2.5 py-1.5 rounded-md transition-all border border-gray-100 hover:border-green-200"
          >
            <ThumbsUp size={14} /> Looks good
          </button>
        )}
      </div>
    </div>
  );
}

