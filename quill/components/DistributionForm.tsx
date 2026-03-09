'use client';

import { useState, useEffect } from 'react';
import { Copy, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { SkeletonLoader } from './SkeletonLoader';
import { useHistory } from '@/hooks/useHistory';
import { trackGenerationStart, trackGenerationComplete, trackFeedback } from '@/lib/analytics';

interface DistributionData {
  twitter: string;
  linkedin: string;
  newsletter: string;
}

interface DistributionFormProps {
  incomingDraft: string;
  onClearIncomingDraft: () => void;
}
export default function DistributionForm({ 
  incomingDraft, 
  onClearIncomingDraft,
}: DistributionFormProps) {
  const [draftText, setDraftText] = useState('');
  const [distributionData, setDistributionData] = useState<DistributionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [openSection, setOpenSection] = useState<'twitter' | 'linkedin' | 'newsletter' | null>('twitter');
  const [feedbackSent, setFeedbackSent] = useState(false);
  
  const { addItem } = useHistory();

  // Handle incoming draft from Research Brief
  useEffect(() => {
    if (incomingDraft) {
      setDraftText(incomingDraft);
      setDistributionData(null);
      setError('');
    }
  }, [incomingDraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftText.trim()) return;

    setIsLoading(true);
    setError('');
    setDistributionData(null);
    
    trackGenerationStart('distribution');

    try {
      const response = await fetch('/api/distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: draftText }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate distribution copy');
      }

      const data = await response.json();
      setDistributionData(data);
      setOpenSection('twitter'); // Auto-open first section
      
      trackGenerationComplete('distribution', undefined, data.forbidden_words || [], undefined, data.prompt_version);
      
      // addItem expects (type, query, data)
      addItem(
        'distribution',
        draftText.substring(0, 50) + '...',
        data as unknown
      );
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const handleNewDraft = () => {
    setDraftText('');
    setDistributionData(null);
    setError('');
    onClearIncomingDraft();
  };

  const toggleSection = (section: 'twitter' | 'linkedin' | 'newsletter') => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleReinforce = async () => {
    if (!distributionData) return;
    setFeedbackSent(true);
    trackFeedback('distribution', 'all_assets', 'approved');
    try {
      await fetch("/api/learning/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          article_text: `TWITTER: ${distributionData.twitter}\n\nLINKEDIN: ${distributionData.linkedin}\n\nNEWSLETTER: ${distributionData.newsletter}`,
          rating: 'positive',
          metadata: { type: 'distribution' }
        }),
      });
    } catch (err) {
      console.error("Failed to save distribution feedback:", err);
    }
  };


  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="draft-dist" className="block text-sm font-medium text-gray-700 mb-1">
            Article Draft
          </label>
          <textarea
            id="draft-dist"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            className="w-full h-48 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all shadow-sm hover:border-gray-300 resize-none font-sans text-gray-800"
            placeholder="Paste your completed article draft here to generate social copy & newsletters..."
            required
          />
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading || !draftText.trim()}
            className="flex-1 bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-500 transition-colors shadow-sm"
          >
            {isLoading ? 'Generating Assets...' : 'Generate Distribution Assets'}
          </button>
          
          {(distributionData || draftText) && (
            <button
              type="button"
              onClick={handleNewDraft}
              className="px-6 py-3 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors border border-gray-200"
            >
              New Draft
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="space-y-4 mt-8">
          <SkeletonLoader />
          <SkeletonLoader />
          <SkeletonLoader />
        </div>
      )}

      {distributionData && !isLoading && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-2 mb-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-100 animate-in zoom-in duration-300">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">Distribution copy generated successfully.</span>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-6 flex items-center justify-between group">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Reinforce Pipeline</h3>
              <p className="text-xs text-gray-500">Approve these results to help the AI learn your preferred Forbes social voice.</p>
            </div>
            {feedbackSent ? (
              <span className="text-sm text-green-600 font-semibold flex items-center gap-1.5 bg-green-50 px-4 py-2 rounded-lg border border-green-100 italic transition-all">
                <CheckCircle size={16} /> Learned
              </span>
            ) : (
              <button 
                onClick={handleReinforce}
                className="text-sm font-semibold text-gray-600 hover:text-green-700 hover:bg-green-50 px-6 py-2.5 rounded-lg transition-all border border-gray-200 hover:border-green-200 shadow-sm"
              >
                Approve for Learnings
              </button>
            )}
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-6">Distribution Copy</h2>
          
          {/* X / Twitter Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
            <button 
              onClick={() => toggleSection('twitter')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">X (Twitter) Update</h3>
              {openSection === 'twitter' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
            </button>
            {openSection === 'twitter' && (
              <div className="p-5 border-t border-gray-200 flex justify-between items-start gap-4">
                <p className="text-gray-800 whitespace-pre-wrap flex-1">{String(distributionData.twitter || "")}</p>
                <button
                  onClick={() => copyToClipboard(String(distributionData.twitter || ""))}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                  title="Copy to clipboard"
                >
                  <Copy size={18} />
                </button>
              </div>
            )}
          </div>

          {/* LinkedIn Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
            <button 
              onClick={() => toggleSection('linkedin')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">LinkedIn Post</h3>
              {openSection === 'linkedin' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
            </button>
            {openSection === 'linkedin' && (
              <div className="p-5 border-t border-gray-200 flex justify-between items-start gap-4">
                <p className="text-gray-800 whitespace-pre-wrap flex-1">{String(distributionData.linkedin || "")}</p>
                <button
                  onClick={() => copyToClipboard(String(distributionData.linkedin || ""))}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                  title="Copy to clipboard"
                >
                  <Copy size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Newsletter Section */}
           <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
            <button 
              onClick={() => toggleSection('newsletter')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">Newsletter Entry</h3>
              {openSection === 'newsletter' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
            </button>
            {openSection === 'newsletter' && (
              <div className="p-5 border-t border-gray-200 flex justify-between items-start gap-4">
                <p className="text-gray-800 whitespace-pre-wrap flex-1 leading-relaxed">{String(distributionData.newsletter || "")}</p>
                <button
                  onClick={() => copyToClipboard(String(distributionData.newsletter || ""))}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                  title="Copy to clipboard"
                >
                  <Copy size={18} />
                </button>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
