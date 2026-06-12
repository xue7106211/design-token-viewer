import { parseTokenJSON } from "@/lib/parsers";
import { resolveTokens } from "@/lib/token-resolver";
import { rebuildRawJSON } from "@/lib/token-rebuilder";
import type {
  DesignToken,
  ParsedTokenData,
  TokenValue,
} from "@/types/token";
import type { ChangeType, LogEntry } from "@/types/changelog";

export const DEFAULT_DOCUMENT_ID = "default";
export const DEFAULT_DOCUMENT_NAME = "HyperOS Tokens";

export type Actor = {
  actorName: string;
  actorClientId: string;
  ip: string;
};

export type ServerChangeType = ChangeType | "restore_snapshot" | "create_snapshot" | "import_document";

export interface TokenDocumentRecord {
  id: string;
  name: string;
  currentJson: unknown;
  revision: number;
  updatedAt: number;
  updatedBy?: string;
}

export interface TokenDocumentView extends TokenDocumentRecord, ParsedTokenData {}

export interface ServerLogEntry extends Omit<LogEntry, "changeType"> {
  documentId: string;
  changeType: ServerChangeType;
  actorName: string;
  actorClientId: string;
}

export interface SnapshotRecord {
  id: string;
  documentId: string;
  name: string;
  description?: string;
  json: unknown;
  createdBy: string;
  createdAt: number;
}

export interface CollaborationRepository {
  getDocument: (id: string) => Promise<TokenDocumentRecord | null>;
  saveDocument: (document: TokenDocumentRecord) => Promise<TokenDocumentRecord>;
  addLog: (entry: ServerLogEntry) => Promise<ServerLogEntry>;
  listLogs: (documentId: string) => Promise<ServerLogEntry[]>;
  addSnapshot: (snapshot: SnapshotRecord) => Promise<SnapshotRecord>;
  listSnapshots: (documentId: string) => Promise<SnapshotRecord[]>;
  getSnapshot: (id: string) => Promise<SnapshotRecord | null>;
}

type DocumentSummary = {
  label: string;
  collections: number;
  tokens: number;
};

export class ConflictError extends Error {
  constructor() {
    super("Token 表已被其他人更新，请刷新后再修改。");
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class InvalidTokenDocumentError extends Error {
  constructor() {
    super("Token JSON 格式无法识别。");
    this.name = "InvalidTokenDocumentError";
  }
}

export function createMemoryCollaborationRepository(): CollaborationRepository {
  const documents = new Map<string, TokenDocumentRecord>();
  const logs: ServerLogEntry[] = [];
  const snapshots = new Map<string, SnapshotRecord>();

  return {
    async getDocument(id) {
      const document = documents.get(id);
      return document ? clone(document) : null;
    },
    async saveDocument(document) {
      const next = clone(document);
      documents.set(next.id, next);
      return clone(next);
    },
    async addLog(entry) {
      const next = clone(entry);
      logs.push(next);
      return clone(next);
    },
    async listLogs(documentId) {
      return logs.filter((entry) => entry.documentId === documentId).map(clone);
    },
    async addSnapshot(snapshot) {
      const next = clone(snapshot);
      snapshots.set(next.id, next);
      return clone(next);
    },
    async listSnapshots(documentId) {
      return [...snapshots.values()]
        .filter((snapshot) => snapshot.documentId === documentId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(clone);
    },
    async getSnapshot(id) {
      const snapshot = snapshots.get(id);
      return snapshot ? clone(snapshot) : null;
    },
  };
}

export function createTokenDocumentService(
  repository: CollaborationRepository,
  initialJson: unknown,
  documentId = DEFAULT_DOCUMENT_ID,
  documentName = DEFAULT_DOCUMENT_NAME
) {
  async function ensureDocument(): Promise<TokenDocumentRecord> {
    const existing = await repository.getDocument(documentId);
    if (existing) return existing;

    const now = Date.now();
    return repository.saveDocument({
      id: documentId,
      name: documentName,
      currentJson: clone(initialJson),
      revision: 1,
      updatedAt: now,
      updatedBy: "system",
    });
  }

  async function getDocument(): Promise<TokenDocumentView> {
    const document = await ensureDocument();
    return toDocumentView(document);
  }

  async function updateDocument(
    revision: number,
    actor: Actor,
    changeType: ServerChangeType,
    mutate: (data: ParsedTokenData) => {
      tokenId?: string;
      tokenName?: string;
      oldValue?: unknown;
      newValue?: unknown;
      meta?: Record<string, unknown>;
    }
  ): Promise<TokenDocumentView> {
    const document = await ensureDocument();
    assertFreshRevision(document, revision);

    const parsed = parseAndResolve(document.currentJson);
    const logPayload = mutate(parsed);
    const rawJSON = rebuildRawJSON(parsed.collections, parsed.tokens);
    const updated = await repository.saveDocument({
      ...document,
      currentJson: rawJSON,
      revision: document.revision + 1,
      updatedAt: Date.now(),
      updatedBy: actor.actorName,
    });

    await repository.addLog({
      id: randomId(),
      documentId: document.id,
      timestamp: updated.updatedAt,
      ip: actor.ip,
      actorName: actor.actorName,
      actorClientId: actor.actorClientId,
      changeType,
      ...logPayload,
    });

    return toDocumentView(updated);
  }

  return {
    getDocument,

    async importDocument(input: { json: unknown; revision: number; actor: Actor }) {
      const document = await ensureDocument();
      assertFreshRevision(document, input.revision);
      parseAndResolve(input.json);
      const updated = await repository.saveDocument({
        ...document,
        currentJson: clone(input.json),
        revision: document.revision + 1,
        updatedAt: Date.now(),
        updatedBy: input.actor.actorName,
      });
      await repository.addLog({
        id: randomId(),
        documentId: document.id,
        timestamp: updated.updatedAt,
        ip: input.actor.ip,
        actorName: input.actor.actorName,
        actorClientId: input.actor.actorClientId,
        changeType: "import_document",
        oldValue: summarizeDocument(document.currentJson, "原文档"),
        newValue: summarizeDocument(input.json, "导入文档"),
      });
      return toDocumentView(updated);
    },

    updateTokenValue(input: {
      tokenId: string;
      modeId: string;
      value: TokenValue;
      revision: number;
      actor: Actor;
    }) {
      return updateDocument(input.revision, input.actor, "update_value", (data) => {
        const token = getTokenOrThrow(data.tokens, input.tokenId);
        const oldValue = token.rawValues[input.modeId];
        token.rawValues = { ...token.rawValues, [input.modeId]: input.value };
        return {
          tokenId: token.id,
          tokenName: token.name,
          oldValue,
          newValue: input.value,
          meta: { modeId: input.modeId },
        };
      });
    },

    updateTokenName(input: {
      tokenId: string;
      newName: string;
      revision: number;
      actor: Actor;
    }) {
      return updateDocument(input.revision, input.actor, "update_name", (data) => {
        const token = getTokenOrThrow(data.tokens, input.tokenId);
        const oldName = token.name;
        const trimmed = input.newName.trim();
        if (!trimmed) throw new Error("Token name cannot be empty");
        const path = trimmed.split("/").filter(Boolean);
        token.name = trimmed;
        token.path = path;
        token.group = path.slice(0, -1).join("/");
        return {
          tokenId: token.id,
          tokenName: trimmed,
          oldValue: oldName,
          newValue: trimmed,
        };
      });
    },

    updateTokenDescription(input: {
      tokenId: string;
      description: string;
      revision: number;
      actor: Actor;
    }) {
      return updateDocument(input.revision, input.actor, "update_description", (data) => {
        const token = getTokenOrThrow(data.tokens, input.tokenId);
        const oldValue = token.description;
        token.description = input.description || undefined;
        return {
          tokenId: token.id,
          tokenName: token.name,
          oldValue,
          newValue: token.description,
        };
      });
    },

    updateTokenCodeSyntax(input: {
      tokenId: string;
      codeSyntax: { WEB?: string; ANDROID?: string; iOS?: string };
      revision: number;
      actor: Actor;
    }) {
      return updateDocument(input.revision, input.actor, "update_code_syntax", (data) => {
        const token = getTokenOrThrow(data.tokens, input.tokenId);
        const oldValue = token.codeSyntax;
        token.codeSyntax = input.codeSyntax;
        return {
          tokenId: token.id,
          tokenName: token.name,
          oldValue,
          newValue: input.codeSyntax,
        };
      });
    },

    setTokenAlias(input: {
      tokenId: string;
      modeId: string;
      targetTokenId: string | null;
      revision: number;
      actor: Actor;
    }) {
      return updateDocument(input.revision, input.actor, "set_alias", (data) => {
        const token = getTokenOrThrow(data.tokens, input.tokenId);
        const oldValue = token.rawValues[input.modeId];
        const nextValue =
          input.targetTokenId == null
            ? token.resolvedValues[input.modeId]
            : { type: "ALIAS" as const, id: input.targetTokenId };
        if (!nextValue) throw new Error("No resolved value for this mode");
        token.rawValues = { ...token.rawValues, [input.modeId]: nextValue };
        return {
          tokenId: token.id,
          tokenName: token.name,
          oldValue,
          newValue: nextValue,
          meta: { modeId: input.modeId },
        };
      });
    },

    deleteToken(input: { tokenId: string; revision: number; actor: Actor }) {
      return updateDocument(input.revision, input.actor, "delete_token", (data) => {
        const token = getTokenOrThrow(data.tokens, input.tokenId);
        delete data.tokens[input.tokenId];
        data.collections = data.collections.map((collection) => ({
          ...collection,
          tokenIds: collection.tokenIds.filter((id) => id !== input.tokenId),
        }));
        return {
          tokenId: token.id,
          tokenName: token.name,
          oldValue: token,
          meta: { type: token.type },
        };
      });
    },

    reorderTokens(input: {
      collectionId: string;
      tokenIds: string[];
      revision: number;
      actor: Actor;
    }) {
      return updateDocument(input.revision, input.actor, "reorder", (data) => {
        const collection = data.collections.find((item) => item.id === input.collectionId);
        if (!collection) throw new NotFoundError("Collection not found");

        const currentIds = collection.tokenIds;
        const currentIdSet = new Set(currentIds);
        const nextIdSet = new Set(input.tokenIds);
        const hasSameMembers =
          input.tokenIds.length === currentIds.length &&
          input.tokenIds.every((id) => currentIdSet.has(id)) &&
          currentIds.every((id) => nextIdSet.has(id));
        if (!hasSameMembers) throw new Error("Token order must include the same collection tokens");

        collection.tokenIds = [...input.tokenIds];
        return {
          oldValue: { collectionId: collection.id, tokenIds: currentIds },
          newValue: { collectionId: collection.id, tokenIds: collection.tokenIds },
          meta: {
            collectionId: collection.id,
            collectionName: collection.name,
            count: collection.tokenIds.length,
          },
        };
      });
    },

    renameGroup(input: {
      oldPath: string;
      newPath: string;
      revision: number;
      actor: Actor;
    }) {
      return updateDocument(input.revision, input.actor, "rename_group", (data) => {
        const oldPath = input.oldPath.trim();
        const newPath = input.newPath.trim();
        if (!oldPath || !newPath) throw new Error("Group path cannot be empty");
        if (oldPath === newPath) {
          return {
            oldValue: oldPath,
            newValue: newPath,
            meta: { count: 0 },
          };
        }

        const prefix = `${oldPath}/`;
        const affected = Object.values(data.tokens).filter(
          (token) => token.name === oldPath || token.name.startsWith(prefix)
        );

        for (const token of affected) {
          const nextName = token.name === oldPath ? newPath : newPath + token.name.slice(oldPath.length);
          const path = nextName.split("/").filter(Boolean);
          token.name = nextName;
          token.path = path;
          token.group = path.slice(0, -1).join("/");
        }

        return {
          oldValue: oldPath,
          newValue: newPath,
          meta: { count: affected.length },
        };
      });
    },

    async getChangeLogs() {
      const document = await ensureDocument();
      return repository.listLogs(document.id);
    },

    async createSnapshot(input: { name: string; description?: string; actor: Actor }) {
      const document = await ensureDocument();
      const snapshot = await repository.addSnapshot({
        id: randomId(),
        documentId: document.id,
        name: input.name.trim() || "Untitled snapshot",
        description: input.description?.trim() || undefined,
        json: clone(document.currentJson),
        createdBy: input.actor.actorName,
        createdAt: Date.now(),
      });
      await repository.addLog({
        id: randomId(),
        documentId: document.id,
        timestamp: snapshot.createdAt,
        ip: input.actor.ip,
        actorName: input.actor.actorName,
        actorClientId: input.actor.actorClientId,
        changeType: "create_snapshot",
        newValue: { snapshotId: snapshot.id, name: snapshot.name },
      });
      return snapshot;
    },

    async getSnapshots() {
      const document = await ensureDocument();
      return repository.listSnapshots(document.id);
    },

    async getSnapshot(snapshotId: string) {
      const document = await ensureDocument();
      const snapshot = await repository.getSnapshot(snapshotId);
      if (!snapshot || snapshot.documentId !== document.id) {
        throw new NotFoundError("Snapshot not found");
      }
      return snapshot;
    },

    async restoreSnapshot(input: { snapshotId: string; revision: number; actor: Actor }) {
      const document = await ensureDocument();
      assertFreshRevision(document, input.revision);
      const snapshot = await repository.getSnapshot(input.snapshotId);
      if (!snapshot) throw new NotFoundError("Snapshot not found");
      const updated = await repository.saveDocument({
        ...document,
        currentJson: clone(snapshot.json),
        revision: document.revision + 1,
        updatedAt: Date.now(),
        updatedBy: input.actor.actorName,
      });
      await repository.addLog({
        id: randomId(),
        documentId: document.id,
        timestamp: updated.updatedAt,
        ip: input.actor.ip,
        actorName: input.actor.actorName,
        actorClientId: input.actor.actorClientId,
        changeType: "restore_snapshot",
        oldValue: summarizeDocument(document.currentJson, "恢复前文档"),
        newValue: { snapshotId: snapshot.id, name: snapshot.name },
      });
      return toDocumentView(updated);
    },
  };
}

function parseAndResolve(json: unknown): ParsedTokenData {
  const parsed = parseTokenJSON(json);
  if (!parsed) throw new InvalidTokenDocumentError();
  return resolveTokens(parsed);
}

function toDocumentView(document: TokenDocumentRecord): TokenDocumentView {
  const parsed = parseAndResolve(document.currentJson);
  return {
    ...document,
    currentJson: clone(document.currentJson),
    collections: parsed.collections,
    tokens: parsed.tokens,
  };
}

function assertFreshRevision(document: TokenDocumentRecord, revision: number) {
  if (document.revision !== revision) throw new ConflictError();
}

function summarizeDocument(json: unknown, label: string): DocumentSummary {
  const parsed = parseAndResolve(json);
  return {
    label,
    collections: parsed.collections.length,
    tokens: Object.keys(parsed.tokens).length,
  };
}

function getTokenOrThrow(tokens: Record<string, DesignToken>, tokenId: string) {
  const token = tokens[tokenId];
  if (!token) throw new NotFoundError("Token not found");
  return token;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function randomId() {
  return crypto.randomUUID();
}
