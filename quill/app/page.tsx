"use client";

import { useState } from "react";
import { ResearchForm } from "@/components/ResearchForm";
import { SEOForm } from "@/components/SEOForm";
import DistributionForm from "@/components/DistributionForm";
import { KPIDashboard } from "@/components/KPIDashboard";
import { Sidebar } from "@/components/Sidebar";
import { useHistory, HistoryItem } from "@/hooks/useHistory";
import { PanelLeftOpen } from "lucide-react";
import { SafetyFlagsData } from "@/components/SEOForm";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'research' | 'seo' | 'distribution' | 'stats'>('research');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { history, addItem, deleteItem, clearHistory } = useHistory();
  
  const [activeHistoryItem, setActiveHistoryItem] = useState<HistoryItem | null>(null);

  // Cross-tab communication
  const [incomingDraft, setIncomingDraft] = useState<string>("");
  const [incomingSafetyFlags, setIncomingSafetyFlags] = useState<SafetyFlagsData | null>(null);

  const handleSelectHistory = (item: HistoryItem) => {
    setActiveHistoryItem(item);
    setActiveTab(item.type as 'research' | 'seo' | 'distribution' | 'stats');
    
    // On mobile, close sidebar after selection
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleDraftGenerated = (draftText: string, safetyFlags?: SafetyFlagsData) => {
    setIncomingDraft(draftText);
    setIncomingSafetyFlags(safetyFlags || null);
    setActiveTab("seo");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabSwitch = (tab: 'research' | 'seo' | 'distribution' | 'stats') => {
    setActiveTab(tab);
    setActiveHistoryItem(null); 
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-gray-200">
      
      {/* Sidebar - Mobile Overlay */}
      <div 
        className={`md:hidden fixed inset-0 bg-black/50 z-20 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div 
        className={`fixed md:static inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${sidebarOpen ? 'w-72' : 'w-0 md:w-16'} bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden`}
      >
        <Sidebar 
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          history={history}
          onSelectHistory={handleSelectHistory}
          onDeleteHistory={deleteItem}
          onClearHistory={clearHistory}
          activeId={activeHistoryItem?.id}
        />
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${!sidebarOpen ? 'md:ml-[-4rem]' : ''}`}>
        
        {/* Mobile Header (Shows when sidebar is closed) */}
        <div className="md:hidden flex items-center p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900 focus:outline-none"
          >
            <PanelLeftOpen size={24} />
          </button>
          <div className="font-serif font-bold text-xl tracking-tight ml-2">Forbes Quill</div>
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 w-full">
            
            <header className="mb-10 text-center">
              <h1 className="text-4xl font-serif font-bold text-gray-900 mb-3 tracking-tight hidden md:block">Forbes Quill</h1>
              <p className="text-gray-500 text-lg">Editorial intelligence and workflow augmentation.</p>
            </header>

            {/* Navigation Tabs */}
            <div className="flex justify-center mb-8">
              <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => handleTabSwitch('research')}
                  className={`
                    px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap
                    ${
                      activeTab === "research"
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  Research Brief
                </button>
                <button
                  onClick={() => handleTabSwitch('seo')}
                  className={`
                    px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap
                    ${
                      activeTab === "seo"
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  SEO Metadata
                </button>
                <button
                  onClick={() => handleTabSwitch('distribution')}
                  className={`
                    px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap
                    ${
                      activeTab === "distribution"
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  Distribution Hub
                </button>
                <button
                  onClick={() => handleTabSwitch('stats')}
                  className={`
                    px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap
                    ${
                      activeTab === "stats"
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  KPI Dashboard
                </button>
              </nav>
            </div>

            {/* Content Area - Persisted Forms */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/75 p-6 md:p-8 min-h-[500px] relative overflow-hidden">
              <div className={`transition-opacity duration-300 w-full ${activeTab === "research" ? "block" : "hidden"}`}>
                <ResearchForm 
                  onSuccess={(draft, data) => addItem("research", draft, data)}
                  loadedHistory={activeHistoryItem?.type === "research" ? activeHistoryItem : null}
                  onClearHistory={() => setActiveHistoryItem(null)}
                  onDraftGenerated={handleDraftGenerated}
                />
              </div>
              
              <div className={`transition-opacity duration-300 w-full ${activeTab === "seo" ? "block" : "hidden"}`}>
                <SEOForm 
                  onSuccess={(draft, data) => addItem("seo", draft, data)}
                  loadedHistory={activeHistoryItem?.type === "seo" ? activeHistoryItem : null}
                  onClearHistory={() => setActiveHistoryItem(null)}
                  incomingDraft={incomingDraft}
                  incomingSafetyFlags={incomingSafetyFlags}
                  onNextTab={() => setActiveTab('distribution')}
                />
              </div>

              <div className={`transition-opacity duration-300 w-full ${activeTab === "distribution" ? "block" : "hidden"}`}>
                <DistributionForm 
                  incomingDraft={incomingDraft}
                  onClearIncomingDraft={() => setIncomingDraft('')}
                />
              </div>

              <div className={`transition-opacity duration-300 w-full ${activeTab === "stats" ? "block" : "hidden"}`}>
                <KPIDashboard />
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
