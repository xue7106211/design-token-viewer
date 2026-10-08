import { CHANGE_LOG_PAGE_SIZE } from "@/lib/changelog";
import { parseTokenJSON } from "@/lib/parsers";
import { resolveTokens } from "@/lib/token-resolver";
import { rebuildRawJSON } from "@/lib/token-rebuilder";
import { createExclusiveQueue } from "./exclusive";
import { createStateRepository, type CollaborationState } from "./state-repository";
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

export interface ChangeLogPage {
  entries: ServerLogEntry[];
  total: number;
}

export interface CollaborationRepository {
  getDocument: (id: string) => Promise<TokenDocumentRecord | null>;
  saveDocument: (document: TokenDocumentRecord) => Promise<TokenDocumentRecord>;
  addLog: (entry: ServerLogEntry) => Promise<ServerLogEntry>;
  listLogs: (documentId: string, limit?: number) => Promise<ChangeLogPage>;
  addSnapshot: (snapshot: SnapshotRecord) => Promise<SnapshotRecord>;
  listSnapshots: (documentId: string) => Promise<SnapshotRecord[]>;
  getSnapshot: (id: string) => Promise<SnapshotRecord | null>;
  transact: <T>(run: (tx: CollaborationRepository) => Promise<T>) => Promise<T>;
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
  const live: CollaborationState = { documents: [], logs: [], snapshots: [] };
  const exclusive = createExclusiveQueue();

  function bind(state: CollaborationState) {
    return createStateRepository(state);
  }

  return {
    getDocument: (id) => exclusive(() => bind(live).getDocument(id)),
    saveDocument: (document) => exclusive(() => bind(live).saveDocument(document)),
    addLog: (entry) => exclusive(() => bind(live).addLog(entry)),
    listLogs: (documentId, limit) => exclusive(() => bind(live).listLogs(documentId, limit)),
    addSnapshot: (snapshot) => exclusive(() => bind(live).addSnapshot(snapshot)),
    listSnapshots: (documentId) => exclusive(() => bind(live).listSnapshots(documentId)),
    getSnapshot: (id) => exclusive(() => bind(live).getSnapshot(id)),
    transact: (run) =>
      exclusive(async () => {
        const draft = clone(live);
        const result = await run(bind(draft));
        live.documents = draft.documents;
        live.logs = draft.logs;
        live.snapshots = draft.snapshots;
        return result;
      }),
  };
}

export function createTokenDocumentService(
  repository: CollaborationRepository,
  initialJson: unknown,
  documentId = DEFAULT_DOCUMENT_ID,
  documentName = DEFAULT_DOCUMENT_NAME
) {
  const seedTokens = parseTokenDocument(initialJson).tokens;

  async function ensureDocument(repo: CollaborationRepository = repository): Promise<TokenDocumentRecord> {
    const existing = await repo.getDocument(documentId);
    if (existing) return existing;

    const now = Date.now();
    return repo.saveDocument({
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
    return toDocumentView(document, seedTokens);
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
    return repository.transact(async (tx) => {
      const document = await ensureDocument(tx);
      assertFreshRevision(document, revision);

      const parsed = parseDocumentWithSeedMetadata(document.currentJson, seedTokens);
      const logPayload = mutate(parsed);
      const rawJSON = rebuildRawJSON(parsed.collections, parsed.tokens);
      const updated = await tx.saveDocument({
        ...document,
        currentJson: rawJSON,
        revision: document.revision + 1,
        updatedAt: Date.now(),
        updatedBy: actor.actorName,
      });

      await tx.addLog({
        id: randomId(),
        documentId: document.id,
        timestamp: updated.updatedAt,
        ip: actor.ip,
        actorName: actor.actorName,
        actorClientId: actor.actorClientId,
        changeType,
        ...logPayload,
      });

      return toDocumentView(updated, seedTokens);
    });
  }

  function reorderCollectionTokens(
    data: ParsedTokenData,
    collectionId: string,
    tokenIds: string[]
  ) {
    const collection = data.collections.find((item) => item.id === collectionId);
    if (!collection) throw new NotFoundError("Collection not found");

    const currentIds = collection.tokenIds;
    const currentIdSet = new Set(currentIds);
    const nextIdSet = new Set(tokenIds);
    const hasSameMembers =
      tokenIds.length === currentIds.length &&
      tokenIds.every((id) => currentIdSet.has(id)) &&
      currentIds.every((id) => nextIdSet.has(id));
    if (!hasSameMembers) throw new Error("Token order must include the same collection tokens");

    collection.tokenIds = [...tokenIds];
    return { collection, currentIds };
  }

  return {
    getDocument,

    async importDocument(input: { json: unknown; revision: number; actor: Actor }) {
      return repository.transact(async (tx) => {
        const document = await ensureDocument(tx);
        assertFreshRevision(document, input.revision);
        parseAndResolve(input.json);
        const updated = await tx.saveDocument({
          ...document,
          currentJson: clone(input.json),
          revision: document.revision + 1,
          updatedAt: Date.now(),
          updatedBy: input.actor.actorName,
        });
        await tx.addLog({
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
        return toDocumentView(updated, seedTokens);
      });
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
        const { collection, currentIds } = reorderCollectionTokens(
          data,
          input.collectionId,
          input.tokenIds
        );
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

    moveTokensToGroup(input: {
      tokenIds: string[];
      targetGroup: string;
      collectionId?: string;
      tokenOrder?: string[];
      revision: number;
      actor: Actor;
    }) {
      return updateDocument(input.revision, input.actor, "move_tokens_to_group", (data) => {
        const tokenIds = Array.from(new Set(input.tokenIds));
        if (tokenIds.length === 0) throw new Error("At least one token is required");
        if ((input.collectionId == null) !== (input.tokenOrder == null)) {
          throw new Error("Collection ID and token order must be provided together");
        }

        const targetGroup = input.targetGroup.trim();
        const moved = tokenIds.map((tokenId) => {
          const token = getTokenOrThrow(data.tokens, tokenId);
          const oldName = token.name;
          const leaf = token.path[token.path.length - 1] ?? oldName.split("/").filter(Boolean).pop() ?? oldName;
          const nextName = targetGroup ? `${targetGroup}/${leaf}` : leaf;
          const path = nextName.split("/").filter(Boolean);
          token.name = nextName;
          token.path = path;
          token.group = path.slice(0, -1).join("/");
          return { tokenId, oldName, nextName };
        });

        const reordered =
          input.collectionId && input.tokenOrder
            ? reorderCollectionTokens(data, input.collectionId, input.tokenOrder)
            : null;

        return {
          oldValue: moved.map(({ tokenId, oldName }) => ({ tokenId, name: oldName })),
          newValue: moved.map(({ tokenId, nextName }) => ({ tokenId, name: nextName })),
          meta: {
            count: moved.length,
            targetGroup: targetGroup || "(root)",
            ...(reordered
              ? {
                  collectionId: reordered.collection.id,
                  collectionName: reordered.collection.name,
                  reordered: true,
                }
              : {}),
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
      return repository.listLogs(document.id, CHANGE_LOG_PAGE_SIZE);
    },

    async createSnapshot(input: { name: string; description?: string; actor: Actor }) {
      return repository.transact(async (tx) => {
        const document = await ensureDocument(tx);
        const snapshot = await tx.addSnapshot({
          id: randomId(),
          documentId: document.id,
          name: input.name.trim() || "Untitled snapshot",
          description: input.description?.trim() || undefined,
          json: clone(document.currentJson),
          createdBy: input.actor.actorName,
          createdAt: Date.now(),
        });
        await tx.addLog({
          id: randomId(),
          documentId: document.id,
          timestamp: snapshot.createdAt,
          ip: input.actor.ip,
          actorName: input.actor.actorName,
          actorClientId: input.actor.actorClientId,
          changeType: "create_snapshot",
          newValue: { snapshotId: snapshot.id, name: snapshot.name },
          meta: { snapshotId: snapshot.id, snapshotDocumentId: document.id },
        });
        return snapshot;
      });
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
      return repository.transact(async (tx) => {
        const document = await ensureDocument(tx);
        assertFreshRevision(document, input.revision);
        const snapshot = await tx.getSnapshot(input.snapshotId);
        if (!snapshot || snapshot.documentId !== document.id) {
          throw new NotFoundError("Snapshot not found");
        }
        const updated = await tx.saveDocument({
          ...document,
          currentJson: clone(snapshot.json),
          revision: document.revision + 1,
          updatedAt: Date.now(),
          updatedBy: input.actor.actorName,
        });
        await tx.addLog({
          id: randomId(),
          documentId: document.id,
          timestamp: updated.updatedAt,
          ip: input.actor.ip,
          actorName: input.actor.actorName,
          actorClientId: input.actor.actorClientId,
          changeType: "restore_snapshot",
          oldValue: summarizeDocument(document.currentJson, "恢复前文档"),
          newValue: { snapshotId: snapshot.id, name: snapshot.name },
          meta: { snapshotId: snapshot.id, snapshotDocumentId: snapshot.documentId },
        });
        return toDocumentView(updated, seedTokens);
      });
    },
  };
}

function parseTokenDocument(json: unknown): ParsedTokenData {
  const parsed = parseTokenJSON(json);
  if (!parsed) throw new InvalidTokenDocumentError();
  return parsed;
}

function parseAndResolve(json: unknown): ParsedTokenData {
  return resolveTokens(parseTokenDocument(json));
}

function parseDocumentWithSeedMetadata(
  json: unknown,
  seedTokens: Record<string, DesignToken>
): ParsedTokenData {
  const parsed = parseAndResolve(json);
  for (const token of Object.values(parsed.tokens)) {
    const seedToken = seedTokens[token.id];
    if (!seedToken || seedToken.name !== token.name || seedToken.type !== token.type) continue;
    if (!token.description && seedToken.description) token.description = seedToken.description;
    if (!token.scopes?.length && seedToken.scopes?.length) token.scopes = seedToken.scopes;
  }
  return parsed;
}

function toDocumentView(
  document: TokenDocumentRecord,
  seedTokens: Record<string, DesignToken>
): TokenDocumentView {
  const parsed = parseDocumentWithSeedMetadata(document.currentJson, seedTokens);
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
