export type ModuleType = 'research' | 'draft' | 'seo' | 'distribution';
export type FeedbackSignal = 'approved' | 'regenerated' | 'edited';

interface GenerationEvent {
  id: string;
  module: ModuleType;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  wordCount?: number;
  forbiddenWords?: string[];
  styleScore?: number;
  promptVersion?: string;
  signals: FeedbackSignal[];
}

const STORAGE_KEY = 'quill_analytics_events';

function getEvents(): Record<string, GenerationEvent> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.error('Failed to parse analytics', err);
    return {};
  }
}

function saveEvents(events: Record<string, GenerationEvent>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('Failed to save analytics', err);
  }
}

// Keep track of active generation per module to avoid passing tracking IDs around React
const activeGenerations: Record<string, string> = {};

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function trackGenerationStart(module: ModuleType): string {
  const events = getEvents();
  const id = generateId();
  activeGenerations[module] = id;
  
  events[id] = {
    id,
    module,
    startTime: Date.now(),
    signals: []
  };
  saveEvents(events);
  return id;
}

export function trackGenerationComplete(
  module: ModuleType,
  wordCount?: number,
  forbiddenWords?: string[],
  styleScore?: number,
  promptVersion?: string
) {
  const id = activeGenerations[module];
  if (!id) return;

  const events = getEvents();
  const event = events[id];
  if (!event) return;
  
  event.endTime = Date.now();
  event.durationMs = event.endTime - event.startTime;
  event.wordCount = wordCount;
  event.forbiddenWords = forbiddenWords;
  event.styleScore = styleScore;
  event.promptVersion = promptVersion;
  
  saveEvents(events);
}

export function trackFeedback(
  module: ModuleType,
  outputId: string,
  signal: FeedbackSignal
) {
  const events = getEvents();
  
  // Prefer the active generation for the module, or use outputId as a fallback key
  const id = activeGenerations[module] || outputId;
  
  let event = events[id];
  
  if (!event) {
    event = { id, module, startTime: Date.now(), signals: [] };
    events[id] = event;
  }

  // Prevent duplicate signal spamming
  if (!event.signals.includes(signal)) {
    event.signals.push(signal);
  }
  
  saveEvents(events);
}

export interface KPISummary {
  avg_time_to_draft_mins: number;
  avg_style_score: number;
  regeneration_rate: number;
  forbidden_word_violation_rate: number;
  total_articles_drafted: number;
}

export function getKPISummary(): KPISummary {
  const events = Object.values(getEvents());
  
  const drafts = events.filter(e => e.module === 'draft' && e.endTime);
  const completedDraftsCount = drafts.length;

  let totalDraftTimeMs = 0;
  let totalStyleScore = 0;
  let draftsWithStyleScore = 0;
  let regeneratedCount = 0;
  let forbiddenViolationCount = 0;

  drafts.forEach(d => {
    if (d.durationMs) totalDraftTimeMs += d.durationMs;
    if (d.styleScore !== undefined) {
      totalStyleScore += d.styleScore;
      draftsWithStyleScore++;
    }
    if (d.signals.includes('regenerated')) {
      regeneratedCount++;
    }
    if (d.forbiddenWords && d.forbiddenWords.length > 0) {
      forbiddenViolationCount++;
    }
  });

  const avg_time_to_draft_mins = completedDraftsCount > 0 
    ? Number((totalDraftTimeMs / completedDraftsCount / 60000).toFixed(2)) 
    : 0;

  const avg_style_score = draftsWithStyleScore > 0
    ? Number((totalStyleScore / draftsWithStyleScore).toFixed(2))
    : 0;
    
  const regeneration_rate = completedDraftsCount > 0
    ? Number(((regeneratedCount / completedDraftsCount) * 100).toFixed(1))
    : 0;
    
  const forbidden_word_violation_rate = completedDraftsCount > 0
    ? Number(((forbiddenViolationCount / completedDraftsCount) * 100).toFixed(1))
    : 0;

  return {
    avg_time_to_draft_mins,
    avg_style_score,
    regeneration_rate,
    forbidden_word_violation_rate,
    total_articles_drafted: completedDraftsCount
  };
}
