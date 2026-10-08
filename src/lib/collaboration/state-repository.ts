import { CHANGE_LOG_PAGE_SIZE, pageByNewest } from "@/lib/changelog";
import type {
  CollaborationRepository,
  ServerLogEntry,
  SnapshotRecord,
  TokenDocumentRecord,
} from "./service";

export interface CollaborationState {
  documents: TokenDocumentRecord[];
  logs: ServerLogEntry[];
  snapshots: SnapshotRecord[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createStateRepository(state: CollaborationState): CollaborationRepository {
  return {
    async getDocument(id) {
      const document = state.documents.find((item) => item.id === id);
      return document ? clone(document) : null;
    },

    async saveDocument(document) {
      const next = clone(document);
      const index = state.documents.findIndex((item) => item.id === document.id);
      if (index >= 0) state.documents[index] = next;
      else state.documents.push(next);
      return clone(next);
    },

    async addLog(entry) {
      const next = clone(entry);
      state.logs.push(next);
      return clone(next);
    },

    async listLogs(documentId, limit = CHANGE_LOG_PAGE_SIZE) {
      const page = pageByNewest(
        state.logs.filter((entry) => entry.documentId === documentId),
        limit,
      );
      return { entries: page.entries.map(clone), total: page.total };
    },

    async addSnapshot(snapshot) {
      const next = clone(snapshot);
      const index = state.snapshots.findIndex((item) => item.id === snapshot.id);
      if (index >= 0) state.snapshots[index] = next;
      else state.snapshots.push(next);
      return clone(next);
    },

    async listSnapshots(documentId) {
      return state.snapshots
        .filter((snapshot) => snapshot.documentId === documentId)
        .sort((left, right) => right.createdAt - left.createdAt)
        .map(clone);
    },

    async getSnapshot(id) {
      const snapshot = state.snapshots.find((item) => item.id === id);
      return snapshot ? clone(snapshot) : null;
    },

    async transact(run) {
      return run(this);
    },
  };
}
