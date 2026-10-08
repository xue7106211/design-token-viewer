import type { ChangeLogPage, SnapshotRecord, TokenDocumentView } from "./service";

const ACTOR_NAME_KEY = "design-token-actor-name";
const ACTOR_CLIENT_ID_KEY = "design-token-actor-client-id";
const ACTOR_SOURCE_KEY = "design-token-actor-source";

// 可切换的 Token 表（文档）。id 必须与 server.ts 的 DOCUMENTS 注册表保持一致。
export const TOKEN_DOCUMENTS = [
  { id: "hyperos3", label: "HyperOS 3" },
  { id: "hyperos4", label: "HyperOS 4" },
] as const;

export const DEFAULT_DOCUMENT_ID = "hyperos4";

// 模块级当前文档 id：所有 apiRequest 自动带上 x-document-id 头，
// 由 token-store 在切换/水合时通过 setActiveDocumentId 同步。
let activeDocumentId: string = DEFAULT_DOCUMENT_ID;

export function setActiveDocumentId(id: string) {
  activeDocumentId = id;
}

export function getActiveDocumentId() {
  return activeDocumentId;
}

export type ClientActor = {
  actorName: string;
  actorClientId: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getStoredActor(): ClientActor | null {
  if (typeof window === "undefined") return null;
  const actorName = localStorage.getItem(ACTOR_NAME_KEY);
  const actorClientId = localStorage.getItem(ACTOR_CLIENT_ID_KEY);
  if (!actorName || !actorClientId) return null;
  return { actorName, actorClientId };
}

export function setStoredActorName(actorName: string): ClientActor {
  if (typeof window === "undefined") {
    return { actorName, actorClientId: "server" };
  }
  const trimmed = actorName.trim() || "Anonymous";
  let actorClientId = localStorage.getItem(ACTOR_CLIENT_ID_KEY);
  if (!actorClientId) {
    actorClientId = crypto.randomUUID();
    localStorage.setItem(ACTOR_CLIENT_ID_KEY, actorClientId);
  }
  localStorage.setItem(ACTOR_NAME_KEY, trimmed);
  localStorage.setItem(ACTOR_SOURCE_KEY, "manual");
  return { actorName: trimmed, actorClientId };
}

export function setStoredActorFromIP(ip: string): ClientActor {
  if (typeof window === "undefined") {
    return { actorName: ip, actorClientId: "server" };
  }
  const actorName = ip.trim() || "unknown";
  let actorClientId = localStorage.getItem(ACTOR_CLIENT_ID_KEY);
  if (!actorClientId) {
    actorClientId = crypto.randomUUID();
    localStorage.setItem(ACTOR_CLIENT_ID_KEY, actorClientId);
  }
  localStorage.setItem(ACTOR_NAME_KEY, actorName);
  localStorage.setItem(ACTOR_SOURCE_KEY, "ip");
  return { actorName, actorClientId };
}

export function ensureActor(): ClientActor {
  const existing = getStoredActor();
  if (existing) return existing;
  if (typeof window === "undefined") {
    return { actorName: "unknown", actorClientId: "server" };
  }
  return setStoredActorFromIP("unknown");
}

export async function initializeActorFromIP() {
  if (typeof window === "undefined") return;
  const source = localStorage.getItem(ACTOR_SOURCE_KEY);
  if (source && source !== "ip") return;

  const response = await apiRequest<{ ip: string }>("/api/client-ip");
  setStoredActorFromIP(response.ip);
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-document-id": activeDocumentId,
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "Request failed",
      response.status
    );
  }
  return payload as T;
}

export function withActor(body: Record<string, unknown>) {
  return {
    ...body,
    actor: ensureActor(),
  };
}

export type TokenDocumentResponse = TokenDocumentView;
export type ChangeLogsResponse = ChangeLogPage;
export type SnapshotsResponse = { snapshots: SnapshotRecord[] };
