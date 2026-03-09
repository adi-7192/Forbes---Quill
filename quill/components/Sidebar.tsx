"use client";

import { HistoryItem } from "@/hooks/useHistory";
import { FileText, Search, Trash2, Clock, PanelLeftOpen } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  history: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  onClearHistory: () => void;
  activeId?: string;
}

export function Sidebar({ 
  isOpen, 
  onToggle, 
  history, 
  onSelectHistory, 
  onDeleteHistory, 
  onClearHistory, 
  activeId 
}: SidebarProps) {
  return (
    <aside className="w-full h-full bg-white flex flex-col overflow-hidden">
      <div className={`p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 ${!isOpen ? 'justify-center' : ''}`}>
        {isOpen && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Quill</h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Forbes Editorial</p>
          </div>
        )}
        <button 
          onClick={onToggle}
          className={`${isOpen ? 'p-2 -mr-2' : ''} text-gray-400 hover:text-gray-900 transition-all`}
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        >
          <PanelLeftOpen size={20} className={`transition-transform duration-300 ${!isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="p-4 flex-shrink-0 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm z-10">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          Recent Activity
        </h2>
        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        {history.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400 flex flex-col items-center justify-center h-48">
            <Search size={24} className="mb-3 opacity-20" />
            <p>No history yet.</p>
            <p className="text-xs mt-1">Your recent generations will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {history.map((item) => (
              <li
                key={item.id}
                className={`group relative cursor-pointer transition-colors p-4 ${
                  activeId === item.id ? "bg-gray-100 border-l-4 border-black" : "hover:bg-gray-50 border-l-4 border-transparent"
                }`}
                onClick={() => onSelectHistory(item)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      {item.type === "research" ? (
                        <Search size={14} className="text-blue-500 flex-shrink-0" />
                      ) : (
                        <FileText size={14} className="text-green-500 flex-shrink-0" />
                      )}
                      <span className="text-xs font-medium text-gray-500 capitalize">{item.type}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {new Date(item.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.type === "research" ? item.query : "SEO Meta: " + item.query.substring(0, 30) + "..."}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteHistory(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all ml-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
