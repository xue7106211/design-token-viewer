import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { count, desc, eq } from "drizzle-orm";
import { CHANGE_LOG_PAGE_SIZE } from "@/lib/changelog";
import { getDb, hasDatabaseUrl } from "@/lib/db";
import { changeLogs, snapshots, tokenDocuments } from "@/lib/db/schema";
import { createExclusiveQueue } from "./exclusive";
import { createStateRepository, type CollaborationState } from "./state-repository";
import type {
  CollaborationRepository,
  ServerChangeType,
  ServerLogEntry,
  SnapshotRecord,
  TokenDocumentRecord,
} from "./service";

const FILE_STORE_PATH = path.join(process.cwd(), ".data", "collaboration-store.json");

let repository: CollaborationRepository | null = null;

export type RepositoryKind = "postgres" | "file" | "missing-database";

type Database = ReturnType<typeof getDb>;
type DatabaseExecutor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

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
    transact: async () => error(),
  };
}

export function createDrizzleCollaborationRepository(
  executor?: DatabaseExecutor,
): CollaborationRepository {
  const database = () => executor ?? getDb();
  const repo: CollaborationRepository = {
    async getDocument(id) {
      const query = database()
        .select()
        .from(tokenDocuments)
        .where(eq(tokenDocuments.id, id))
        .limit(1);
      const [row] = executor ? await query.for("update") : await query;
      return row ? mapDocument(row) : null;
    },

    async saveDocument(document) {
      const updatedAt = new Date(document.updatedAt);
      const [row] = await database()
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
      return mapDocument(row);
    },

    async addLog(entry) {
      const [row] = await database()
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
      return mapLog(row);
    },

    async listLogs(documentId, limit = CHANGE_LOG_PAGE_SIZE) {
      const where = eq(changeLogs.documentId, documentId);
      const [summary] = await database()
        .select({ total: count() })
        .from(changeLogs)
        .where(where);
      const rows = await database()
        .select()
        .from(changeLogs)
        .where(where)
        .orderBy(desc(changeLogs.createdAt), desc(changeLogs.id))
        .limit(limit);
      return {
        entries: rows.map(mapLog),
        total: Number(summary?.total ?? 0),
      };
    },

    async addSnapshot(snapshot) {
      const [row] = await database()
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
      return mapSnapshot(row);
    },

    async listSnapshots(documentId) {
      const rows = await database()
        .select()
        .from(snapshots)
        .where(eq(snapshots.documentId, documentId))
        .orderBy(desc(snapshots.createdAt));
      return rows.map(mapSnapshot);
    },

    async getSnapshot(id) {
      const [row] = await database()
        .select()
        .from(snapshots)
        .where(eq(snapshots.id, id))
        .limit(1);
      return row ? mapSnapshot(row) : null;
    },

    async transact(run) {
      if (executor) return run(repo);
      return getDb().transaction(async (tx) => run(createDrizzleCollaborationRepository(tx)));
    },
  };
  return repo;
}

export function createFileCollaborationRepository(filePath: string): CollaborationRepository {
  const exclusive = createExclusiveQueue();

  async function readState(): Promise<CollaborationState> {
    try {
      const text = await readFile(filePath, "utf-8");
      const parsed = JSON.parse(text) as Partial<CollaborationState>;
      return {
        documents: parsed.documents ?? [],
        logs: parsed.logs ?? [],
        snapshots: parsed.snapshots ?? [],
      };
    } catch {
      return { documents: [], logs: [], snapshots: [] };
    }
  }

  async function writeState(state: CollaborationState) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
  }

  function access<T>(persist: boolean, run: (state: CollaborationState) => Promise<T>) {
    return exclusive(async () => {
      const state = await readState();
      const result = await run(state);
      if (persist) await writeState(state);
      return result;
    });
  }

  return {
    getDocument: (id) => access(false, (state) => createStateRepository(state).getDocument(id)),
    saveDocument: (document) =>
      access(true, (state) => createStateRepository(state).saveDocument(document)),
    addLog: (entry) => access(true, (state) => createStateRepository(state).addLog(entry)),
    listLogs: (documentId, limit) =>
      access(false, (state) => createStateRepository(state).listLogs(documentId, limit)),
    addSnapshot: (snapshot) =>
      access(true, (state) => createStateRepository(state).addSnapshot(snapshot)),
    listSnapshots: (documentId) =>
      access(false, (state) => createStateRepository(state).listSnapshots(documentId)),
    getSnapshot: (id) => access(false, (state) => createStateRepository(state).getSnapshot(id)),
    transact: (run) => access(true, (state) => run(createStateRepository(state))),
  };
}

function mapDocument(row: {
  id: string;
  name: string;
  currentJson: unknown;
  revision: number;
  updatedAt: Date;
  updatedBy: string | null;
}): TokenDocumentRecord {
  return {
    id: row.id,
    name: row.name,
    currentJson: row.currentJson,
    revision: row.revision,
    updatedAt: row.updatedAt.getTime(),
    updatedBy: row.updatedBy ?? undefined,
  };
}

function mapLog(row: {
  id: string;
  documentId: string;
  createdAt: Date;
  ip: string;
  actorName: string;
  actorClientId: string;
  changeType: string;
  tokenId: string | null;
  tokenName: string | null;
  oldValue: unknown;
  newValue: unknown;
  meta: Record<string, unknown> | null;
}): ServerLogEntry {
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
}

function mapSnapshot(row: {
  id: string;
  documentId: string;
  name: string;
  description: string | null;
  json: unknown;
  createdBy: string;
  createdAt: Date;
}): SnapshotRecord {
  return {
    id: row.id,
    documentId: row.documentId,
    name: row.name,
    description: row.description ?? undefined,
    json: row.json,
    createdBy: row.createdBy,
    createdAt: row.createdAt.getTime(),
  };
}
