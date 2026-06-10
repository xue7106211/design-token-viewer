import { NextResponse, type NextRequest } from "next/server";
import sampleHyperOS3 from "@/data/sample-tokens.json";
import sampleHyperOS4 from "@/data/sample-tokens-hyperos4.json";
import {
  ConflictError,
  InvalidTokenDocumentError,
  NotFoundError,
  createTokenDocumentService,
  type Actor,
} from "./service";
import { getCollaborationRepository } from "./repository";

// 文档注册表：每套 Token 表对应一个种子和显示名。
// id 必须与 client.ts 的 TOKEN_DOCUMENTS 保持一致。
const DOCUMENTS: Record<string, { name: string; seed: unknown }> = {
  hyperos3: { name: "HyperOS 3 Tokens", seed: sampleHyperOS3 },
  hyperos4: { name: "HyperOS 4 Tokens", seed: sampleHyperOS4 },
};

const DEFAULT_DOCUMENT_ID = "hyperos4";

/** 从请求头 x-document-id 解析当前文档 id，非法值回退到默认文档。 */
export function documentIdFromRequest(request: NextRequest): string {
  const id = request.headers.get("x-document-id") ?? "";
  return id in DOCUMENTS ? id : DEFAULT_DOCUMENT_ID;
}

export function getTokenDocumentService(documentId: string = DEFAULT_DOCUMENT_ID) {
  const doc = DOCUMENTS[documentId] ?? DOCUMENTS[DEFAULT_DOCUMENT_ID];
  return createTokenDocumentService(getCollaborationRepository(), doc.seed, documentId, doc.name);
}

export function actorFromRequest(request: NextRequest, body?: unknown): Actor {
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const actor = payload.actor && typeof payload.actor === "object"
    ? (payload.actor as Record<string, unknown>)
    : payload;

  return {
    actorName: readString(actor.actorName) ?? request.headers.get("x-actor-name") ?? "Anonymous",
    actorClientId:
      readString(actor.actorClientId) ?? request.headers.get("x-actor-client-id") ?? "anonymous",
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown",
  };
}

export function jsonError(error: unknown) {
  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof InvalidTokenDocumentError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 500 });
}

export function readRevision(body: unknown): number {
  const value = body && typeof body === "object" ? (body as Record<string, unknown>).revision : undefined;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("revision is required");
  }
  return value;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
