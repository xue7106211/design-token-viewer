import { create } from "zustand";
import type { LogEntry } from "@/types/changelog";
import { fetchClientIP } from "@/lib/changelog";
import { apiRequest, type ChangeLogsResponse } from "@/lib/collaboration/client";

const MAX_ENTRIES = 500;

export interface ChangeLogState {
  entries: LogEntry[];
  clientIP: string;
  isLoading: boolean;
  error: string | null;

  addLogEntry: (entry: Omit<LogEntry, "id" | "timestamp" | "ip">) => void;
  fetchEntries: () => Promise<void>;
  clearAll: () => void;
  setClientIP: (ip: string) => void;
  fetchAndCacheIP: () => Promise<void>;
}

export const useChangeLogStore = create<ChangeLogState>()((set, get) => ({
  entries: [],
  clientIP: "unknown",
  isLoading: false,
  error: null,

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

  fetchEntries: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiRequest<ChangeLogsResponse>("/api/change-logs");
      set({ entries: response.entries.slice(0, MAX_ENTRIES) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "日志加载失败" });
    } finally {
      set({ isLoading: false });
    }
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
}));
