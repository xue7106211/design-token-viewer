import { create } from "zustand";
import type { LogEntry } from "@/types/changelog";
import { apiRequest, getActiveDocumentId, type ChangeLogsResponse } from "@/lib/collaboration/client";

export interface ChangeLogState {
  entries: LogEntry[];
  total: number;
  isLoading: boolean;
  error: string | null;
  epoch: number;

  fetchEntries: () => Promise<void>;
  resetForDocument: () => void;
}

export const useChangeLogStore = create<ChangeLogState>()((set, get) => ({
  entries: [],
  total: 0,
  isLoading: false,
  error: null,
  epoch: 0,

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
}));
