import { create } from "zustand";
import type { LogEntry } from "@/types/changelog";
import { CHANGE_LOG_PAGE_SIZE, fetchClientIP } from "@/lib/changelog";
import { apiRequest, getActiveDocumentId, type ChangeLogsResponse } from "@/lib/collaboration/client";

export interface ChangeLogState {
  entries: LogEntry[];
  total: number;
  clientIP: string;
  isLoading: boolean;
  error: string | null;
  epoch: number;

  addLogEntry: (entry: Omit<LogEntry, "id" | "timestamp" | "ip">) => void;
  fetchEntries: () => Promise<void>;
  resetForDocument: () => void;
  setClientIP: (ip: string) => void;
  fetchAndCacheIP: () => Promise<void>;
}

export const useChangeLogStore = create<ChangeLogState>()((set, get) => ({
  entries: [],
  total: 0,
  clientIP: "unknown",
  isLoading: false,
  error: null,
  epoch: 0,

  addLogEntry: (entry) => {
    const logEntry: LogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ip: get().clientIP,
    };

    set((state) => ({
      entries: [...state.entries, logEntry].slice(-CHANGE_LOG_PAGE_SIZE),
    }));
  },

  fetchEntries: async () => {
    const epoch = get().epoch;
    const documentId = getActiveDocumentId();
    set({ isLoading: true, error: null });
    try {
      const response = await apiRequest<ChangeLogsResponse>("/api/change-logs");
      if (get().epoch !== epoch || getActiveDocumentId() !== documentId) return;
      set({ entries: response.entries, total: response.total, error: null });
    } catch (error) {
      if (get().epoch !== epoch || getActiveDocumentId() !== documentId) return;
      set({ error: error instanceof Error ? error.message : "日志加载失败" });
    } finally {
      if (get().epoch === epoch && getActiveDocumentId() === documentId) {
        set({ isLoading: false });
      }
    }
  },

  resetForDocument: () => {
    set((state) => ({
      epoch: state.epoch + 1,
      entries: [],
      total: 0,
      error: null,
      isLoading: false,
    }));
  },

  setClientIP: (ip: string) => {
    set({ clientIP: ip });
  },

  fetchAndCacheIP: async () => {
    const ip = await fetchClientIP();
    set({ clientIP: ip });
  },
}));
