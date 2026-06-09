import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { desc, eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "@/lib/db";
import { changeLogs, snapshots, tokenDocuments } from "@/lib/db/schema";
import type {
  CollaborationRepository,
  ServerChangeType,
  ServerLogEntry,
  SnapshotRecord,
  TokenDocumentRecord,
} from "./service";

type FileState = {
  documents: TokenDocumentRecord[];
  logs: ServerLogEntry[];
  snapshots: SnapshotRecord[];
};

const FILE_STORE_PATH = path.join(process.cwd(), ".data", "collaboration-store.json");

let repository: CollaborationRepository | null = null;

export type RepositoryKind = "postgres" | "file" | "missing-database";

export function selectRepositoryKind({
  hasDatabaseUrl,
  nodeEnv,
}: {
  hasDatabaseUrl: boolean;
  nodeEnv: string | undefined;
}): RepositoryKind {
  if (hasDatabaseUrl) return "postgres";
  return nodeEnv === "production" ? "missing-database" : "file";
}

export function getCollaborationRepository(): CollaborationRepository {
  if (!repository) {
    const kind = selectRepositoryKind({
      hasDatabaseUrl: hasDatabaseUrl(),
      nodeEnv: process.env.NODE_ENV,
    });
    repository =
      kind === "postgres"
        ? createDrizzleCollaborationRepository()
        : kind === "file"
          ? createFileCollaborationRepository(FILE_STORE_PATH)
          : createMissingDatabaseRepository();
  }
  return repository;
}

export function createMissingDatabaseRepository(): CollaborationRepository {
  const error = () => {
    throw new Error(
      "线上共享 Token 表需要配置 PostgreSQL DATABASE_URL。请在 Netlify 环境变量中配置 DATABASE_URL，并先执行 npm run db:migrate 初始化数据表。"
    );
  };
  return {
    getDocument: async () => error(),
    saveDocument: async () => error(),
    addLog: async () => error(),
    listLogs: async () => error(),
    addSnapshot: async () => error(),
    listSnapshots: async () => error(),
    getSnapshot: async () => error(),
  };
}

export function createDrizzleCollaborationRepository(): CollaborationRepository {
  return {
    async getDocument(id) {
      const [row] = await getDb()
        .select()
        .from(tokenDocuments)
        .where(eq(tokenDocuments.id, id))
        .limit(1);
      return row
        ? {
            id: row.id,
            name: row.name,
            currentJson: row.currentJson,
            revision: row.revision,
            updatedAt: row.updatedAt.getTime(),
            updatedBy: row.updatedBy ?? undefined,
          }
        : null;
    },

    async saveDocument(document) {
      const updatedAt = new Date(document.updatedAt);
      const [row] = await getDb()
        .insert(tokenDocuments)
        .values({
          id: document.id,
          name: document.name,
          currentJson: document.currentJson,
          revision: document.revision,
          updatedAt,
          updatedBy: document.updatedBy,
        })
        .onConflictDoUpdate({
          target: tokenDocuments.id,
          set: {
            name: document.name,
            currentJson: document.currentJson,
            revision: document.revision,
            updatedAt,
            updatedBy: document.updatedBy,
          },
        })
        .returning();
      return {
        id: row.id,
        name: row.name,
        currentJson: row.currentJson,
        revision: row.revision,
        updatedAt: row.updatedAt.getTime(),
        updatedBy: row.updatedBy ?? undefined,
      };
    },

    async addLog(entry) {
      const [row] = await getDb()
        .insert(changeLogs)
        .values({
          id: entry.id,
          documentId: entry.documentId,
          changeType: entry.changeType,
          tokenId: entry.tokenId,
          tokenName: entry.tokenName,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          meta: entry.meta,
          actorName: entry.actorName,
          actorClientId: entry.actorClientId,
          ip: entry.ip,
          createdAt: new Date(entry.timestamp),
        })
        .returning();
      return {
        id: row.id,
        documentId: row.documentId,
        timestamp: row.createdAt.getTime(),
        ip: row.ip,
        actorName: row.actorName,
        actorClientId: row.actorClientId,
        changeType: row.changeType as ServerChangeType,
        tokenId: row.tokenId ?? undefined,
        tokenName: row.tokenName ?? undefined,
        oldValue: row.oldValue,
        newValue: row.newValue,
        meta: row.meta ?? undefined,
      };
    },

    async listLogs(documentId) {
      const rows = await getDb()
        .select()
        .from(changeLogs)
        .where(eq(changeLogs.documentId, documentId))
        .orderBy(desc(changeLogs.createdAt));
      return rows.map((row) => ({
        id: row.id,
        documentId: row.documentId,
        timestamp: row.createdAt.getTime(),
        ip: row.ip,
        actorName: row.actorName,
        actorClientId: row.actorClientId,
        changeType: row.changeType as ServerChangeType,
        tokenId: row.tokenId ?? undefined,
        tokenName: row.tokenName ?? undefined,
        oldValue: row.oldValue,
        newValue: row.newValue,
        meta: row.meta ?? undefined,
      }));
    },

    async addSnapshot(snapshot) {
      const [row] = await getDb()
        .insert(snapshots)
        .values({
          id: snapshot.id,
          documentId: snapshot.documentId,
          name: snapshot.name,
          description: snapshot.description,
          json: snapshot.json,
          createdBy: snapshot.createdBy,
          createdAt: new Date(snapshot.createdAt),
        })
        .returning();
      return {
        id: row.id,
        documentId: row.documentId,
        name: row.name,
        description: row.description ?? undefined,
        json: row.json,
        createdBy: row.createdBy,
        createdAt: row.createdAt.getTime(),
      };
    },

    async listSnapshots(documentId) {
      const rows = await getDb()
        .select()
        .from(snapshots)
        .where(eq(snapshots.documentId, documentId))
        .orderBy(desc(snapshots.createdAt));
      return rows.map((row) => ({
        id: row.id,
        documentId: row.documentId,
        name: row.name,
        description: row.description ?? undefined,
        json: row.json,
        createdBy: row.createdBy,
        createdAt: row.createdAt.getTime(),
      }));
    },

    async getSnapshot(id) {
      const [row] = await getDb()
        .select()
        .from(snapshots)
        .where(eq(snapshots.id, id))
        .limit(1);
      return row
        ? {
            id: row.id,
            documentId: row.documentId,
            name: row.name,
            description: row.description ?? undefined,
            json: row.json,
            createdBy: row.createdBy,
            createdAt: row.createdAt.getTime(),
          }
        : null;
    },
  };
}

export function createFileCollaborationRepository(filePath: string): CollaborationRepository {
  async function readState(): Promise<FileState> {
    try {
      const text = await readFile(filePath, "utf-8");
      return JSON.parse(text) as FileState;
    } catch {
      return { documents: [], logs: [], snapshots: [] };
    }
  }

  async function writeState(state: FileState) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
  }

  return {
    async getDocument(id) {
      const state = await readState();
      return clone(state.documents.find((document) => document.id === id) ?? null);
    },
    async saveDocument(document) {
      const state = await readState();
      const index = state.documents.findIndex((item) => item.id === document.id);
      if (index >= 0) {
        state.documents[index] = clone(document);
      } else {
        state.documents.push(clone(document));
      }
      await writeState(state);
      return clone(document);
    },
    async addLog(entry) {
      const state = await readState();
      state.logs.push(clone(entry));
      await writeState(state);
      return clone(entry);
    },
    async listLogs(documentId) {
      const state = await readState();
      return state.logs
        .filter((entry) => entry.documentId === documentId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(clone);
    },
    async addSnapshot(snapshot) {
      const state = await readState();
      state.snapshots.push(clone(snapshot));
      await writeState(state);
      return clone(snapshot);
    },
    async listSnapshots(documentId) {
      const state = await readState();
      return state.snapshots
        .filter((snapshot) => snapshot.documentId === documentId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(clone);
    },
    async getSnapshot(id) {
      const state = await readState();
      return clone(state.snapshots.find((snapshot) => snapshot.id === id) ?? null);
    },
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
