import { useState, useEffect, useRef, useCallback } from 'react';
import { ParsedSessionState } from '../types/zlce';
import { parseSessionStateMarkdown, serializeSessionStateToMarkdown } from '../utils/markdownParser';
import { INITIAL_SESSION_STATE_MD } from '../data/templates';

const STORAGE_KEY_MARKDOWN = 'zlce_session_raw_markdown';
const STORAGE_KEY_STATE = 'zlce_session_state_data';
const STORAGE_KEY_LAST_SAVED = 'zlce_session_last_saved';
const STORAGE_KEY_HISTORY = 'zlce_session_history';

export interface SessionSnapshot {
  id: string;
  timestamp: number;
  label: string;
  rawMarkdown: string;
  stateData: ParsedSessionState;
}

export interface UseSessionPersistenceReturn {
  lastSaved: Date | null;
  isSaved: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => boolean;
  redo: () => boolean;
  restoreFromStorage: () => boolean;
  restoreSnapshot: (snapshotId: string) => boolean;
  resetToDefault: () => void;
  createManualSnapshot: (label?: string) => void;
  clearStorage: () => void;
  hasStoredSession: boolean;
  history: SessionSnapshot[];
  historyIndex: number;
}

function saveLightweightHistory(snapshots: SessionSnapshot[]) {
  try {
    const lightweight = snapshots.map(({ id, timestamp, label, rawMarkdown }) => ({
      id,
      timestamp,
      label,
      rawMarkdown
    }));
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(lightweight));
  } catch {
    // Storage quota warning fallback
  }
}

export function useSessionPersistence(
  rawMarkdown: string,
  stateData: ParsedSessionState,
  setRawMarkdown: React.Dispatch<React.SetStateAction<string>>,
  setStateData: React.Dispatch<React.SetStateAction<ParsedSessionState>>,
  options: { maxHistory?: number; debounceMs?: number } = {}
): UseSessionPersistenceReturn {
  const { maxHistory = 30, debounceMs = 400 } = options;

  const [lastSaved, setLastSaved] = useState<Date | null>(() => {
    try {
      const savedTime = localStorage.getItem(STORAGE_KEY_LAST_SAVED);
      return savedTime ? new Date(savedTime) : null;
    } catch {
      return null;
    }
  });

  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [hasStoredSession, setHasStoredSession] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MARKDOWN);
      return Boolean(saved && saved.trim().length > 0 && saved !== INITIAL_SESSION_STATE_MD);
    } catch {
      return false;
    }
  });

  // History stack for Undo / Redo in current session
  const [history, setHistory] = useState<SessionSnapshot[]>(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(-maxHistory).map((item: any) => ({
            id: item.id,
            timestamp: item.timestamp,
            label: item.label,
            rawMarkdown: item.rawMarkdown,
            stateData: item.stateData || parseSessionStateMarkdown(item.rawMarkdown)
          }));
        }
      }
    } catch {
      // Fallback
    }
    return [
      {
        id: 'init-' + Date.now(),
        timestamp: Date.now(),
        label: 'Initial State',
        rawMarkdown,
        stateData
      }
    ];
  });

  const [historyIndex, setHistoryIndex] = useState<number>(() => {
    return history.length - 1;
  });

  // Ref flags to prevent infinite loops when updating from undo/redo/restore
  const isInternalChangeRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Persist to localStorage whenever rawMarkdown or stateData changes
  useEffect(() => {
    // If change was triggered by undo/redo/restore, do not record duplicate history step
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    setIsSaved(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        const now = new Date();
        localStorage.setItem(STORAGE_KEY_MARKDOWN, rawMarkdown);
        localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(stateData));
        localStorage.setItem(STORAGE_KEY_LAST_SAVED, now.toISOString());
        setLastSaved(now);
        setIsSaved(true);
        setHasStoredSession(true);

        // Append to history stack if content changed from current position
        const currentSnapshot = history[historyIndex];
        if (!currentSnapshot || currentSnapshot.rawMarkdown !== rawMarkdown) {
          const updatedHistory = history.slice(0, historyIndex + 1);
          const newSnapshot: SessionSnapshot = {
            id: 'snap-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            timestamp: Date.now(),
            label: `Edit (${stateData.status?.activeTask || stateData.context?.projectName || 'Update'})`,
            rawMarkdown,
            stateData
          };

          const trimmed = [...updatedHistory, newSnapshot].slice(-maxHistory);
          setHistory(trimmed);
          setHistoryIndex(trimmed.length - 1);
          saveLightweightHistory(trimmed);
        }
      } catch (err) {
        console.warn('[ZLCE Storage] Gagal menyimpan ke localStorage:', err);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [rawMarkdown, stateData, historyIndex, maxHistory, debounceMs]);

  // Undo: Step back in history
  const undo = useCallback((): boolean => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const targetSnapshot = history[prevIdx];
      if (targetSnapshot) {
        isInternalChangeRef.current = true;
        setHistoryIndex(prevIdx);
        setRawMarkdown(targetSnapshot.rawMarkdown);
        setStateData(targetSnapshot.stateData);
        setIsSaved(true);
        return true;
      }
    }
    return false;
  }, [historyIndex, history, setRawMarkdown, setStateData]);

  // Redo: Step forward in history
  const redo = useCallback((): boolean => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const targetSnapshot = history[nextIdx];
      if (targetSnapshot) {
        isInternalChangeRef.current = true;
        setHistoryIndex(nextIdx);
        setRawMarkdown(targetSnapshot.rawMarkdown);
        setStateData(targetSnapshot.stateData);
        setIsSaved(true);
        return true;
      }
    }
    return false;
  }, [historyIndex, history, setRawMarkdown, setStateData]);

  // Restore: Load persisted rawMarkdown & stateData from localStorage
  const restoreFromStorage = useCallback((): boolean => {
    try {
      const storedMd = localStorage.getItem(STORAGE_KEY_MARKDOWN);
      const storedState = localStorage.getItem(STORAGE_KEY_STATE);

      if (!storedMd) {
        return false;
      }

      let parsedState: ParsedSessionState;
      if (storedState) {
        try {
          parsedState = JSON.parse(storedState);
        } catch {
          parsedState = parseSessionStateMarkdown(storedMd);
        }
      } else {
        parsedState = parseSessionStateMarkdown(storedMd);
      }

      isInternalChangeRef.current = true;
      setRawMarkdown(storedMd);
      setStateData(parsedState);
      setIsSaved(true);

      // Create a snapshot for this restore action
      const restoreSnap: SessionSnapshot = {
        id: 'snap-restore-' + Date.now(),
        timestamp: Date.now(),
        label: 'Restored from LocalStorage',
        rawMarkdown: storedMd,
        stateData: parsedState
      };

      const next = [...history, restoreSnap].slice(-maxHistory);
      setHistory(next);
      setHistoryIndex(next.length - 1);
      saveLightweightHistory(next);

      return true;
    } catch (err) {
      console.error('[ZLCE Storage] Gagal memulihkan sesi dari localStorage:', err);
      return false;
    }
  }, [history, maxHistory, setRawMarkdown, setStateData]);

  // Restore a specific snapshot by ID
  const restoreSnapshot = useCallback((snapshotId: string): boolean => {
    const target = history.find(s => s.id === snapshotId);
    if (!target) return false;

    const idx = history.findIndex(s => s.id === snapshotId);
    isInternalChangeRef.current = true;
    setHistoryIndex(idx);
    setRawMarkdown(target.rawMarkdown);
    setStateData(target.stateData);
    setIsSaved(true);
    return true;
  }, [history, setRawMarkdown, setStateData]);

  // Reset to default template
  const resetToDefault = useCallback(() => {
    const defaultData = parseSessionStateMarkdown(INITIAL_SESSION_STATE_MD);
    isInternalChangeRef.current = true;
    setRawMarkdown(INITIAL_SESSION_STATE_MD);
    setStateData(defaultData);

    const resetSnap: SessionSnapshot = {
      id: 'snap-reset-' + Date.now(),
      timestamp: Date.now(),
      label: 'Reset to Template Awal',
      rawMarkdown: INITIAL_SESSION_STATE_MD,
      stateData: defaultData
    };

    const next = [...history, resetSnap].slice(-maxHistory);
    setHistory(next);
    setHistoryIndex(next.length - 1);
    saveLightweightHistory(next);

    try {
      localStorage.setItem(STORAGE_KEY_MARKDOWN, INITIAL_SESSION_STATE_MD);
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(defaultData));
      localStorage.setItem(STORAGE_KEY_LAST_SAVED, new Date().toISOString());
      setLastSaved(new Date());
      setIsSaved(true);
    } catch {
      // ignore
    }
  }, [maxHistory, setRawMarkdown, setStateData]);

  // Manual snapshot checkpoint
  const createManualSnapshot = useCallback((label?: string) => {
    const newSnapshot: SessionSnapshot = {
      id: 'snap-manual-' + Date.now(),
      timestamp: Date.now(),
      label: label || `Manual Checkpoint (${new Date().toLocaleTimeString('id-ID')})`,
      rawMarkdown,
      stateData
    };

    setHistory(prev => {
      const next = [...prev, newSnapshot].slice(-maxHistory);
      setHistoryIndex(next.length - 1);
      saveLightweightHistory(next);
      return next;
    });
  }, [rawMarkdown, stateData, maxHistory]);

  // Clear storage
  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_MARKDOWN);
      localStorage.removeItem(STORAGE_KEY_STATE);
      localStorage.removeItem(STORAGE_KEY_LAST_SAVED);
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      setHasStoredSession(false);
      setLastSaved(null);
    } catch {
      // ignore
    }
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    lastSaved,
    isSaved,
    canUndo,
    canRedo,
    undo,
    redo,
    restoreFromStorage,
    restoreSnapshot,
    resetToDefault,
    createManualSnapshot,
    clearStorage,
    hasStoredSession,
    history,
    historyIndex
  };
}
