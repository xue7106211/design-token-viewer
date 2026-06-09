import type { SnapshotRecord, TokenDocumentView } from "./service";
import type { ServerLogEntry } from "./service";

const ACTOR_NAME_KEY = "design-token-actor-name";
const ACTOR_CLIENT_ID_KEY = "design-token-actor-client-id";

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
  return { actorName: trimmed, actorClientId };
}

export function ensureActor(): ClientActor {
  const existing = getStoredActor();
  if (existing) return existing;
  if (typeof window === "undefined") {
    return { actorName: "Anonymous", actorClientId: "server" };
  }
  const name = window.prompt("请输入你的名字，用于记录 Token 修改日志") ?? "Anonymous";
  return setStoredActorName(name);
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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
export type ChangeLogsResponse = { entries: ServerLogEntry[] };
export type SnapshotsResponse = { snapshots: SnapshotRecord[] };
