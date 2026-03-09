"use client";

import { useState, useEffect } from "react";

export type HistoryType = "research" | "seo" | "distribution";

export interface HistoryItem {
  id: string;
  type: HistoryType;
  query: string;
  timestamp: number;
  data: any; // Will hold ResearchResponse or SEOResponse
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem("quill_history");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse history", err);
      }
    }
  }, []);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    localStorage.setItem("quill_history", JSON.stringify(items));
  };

  const addItem = (type: HistoryType, query: string, data: any) => {
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      type,
      query,
      timestamp: Date.now(),
      data,
    };
    
    // Prepend to array
    const newHistory = [newItem, ...history];
    saveHistory(newHistory);
  };

  const deleteItem = (id: string) => {
    const newHistory = history.filter((item) => item.id !== id);
    saveHistory(newHistory);
  };

  const clearHistory = () => {
    saveHistory([]);
  };

  return {
    history,
    addItem,
    deleteItem,
    clearHistory,
  };
}
