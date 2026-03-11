// ============================================================
// Design Token Viewer — 修改日志 Zustand Store
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LogEntry } from '@/types/changelog';
import { fetchClientIP } from '@/lib/changelog';

/** 日志条目上限 */
const MAX_ENTRIES = 500;

export interface ChangeLogState {
  entries: LogEntry[];
  clientIP: string;

  // Actions
  addLogEntry: (entry: Omit<LogEntry, 'id' | 'timestamp' | 'ip'>) => void;
  clearAll: () => void;
  setClientIP: (ip: string) => void;
  fetchAndCacheIP: () => Promise<void>;
}

export const useChangeLogStore = create<ChangeLogState>()(
  persist(
    (set, get) => ({
      entries: [],
      clientIP: 'unknown',

      addLogEntry: (entry) => {
        const logEntry: LogEntry = {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          ip: get().clientIP,
        };

        set((state) => ({
          entries: [...state.entries, logEntry].slice(-MAX_ENTRIES),
        }));
      },

      clearAll: () => {
        set({ entries: [] });
      },

      setClientIP: (ip: string) => {
        set({ clientIP: ip });
      },

      fetchAndCacheIP: async () => {
        const ip = await fetchClientIP();
        set({ clientIP: ip });
      },
    }),
    {
      name: 'design-token-changelog',
      partialize: (state) => ({
        entries: state.entries,
        clientIP: state.clientIP,
      }),
    }
  )
);
