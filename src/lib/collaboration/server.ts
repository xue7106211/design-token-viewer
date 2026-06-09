import { NextResponse, type NextRequest } from "next/server";
import sampleData from "@/data/sample-tokens.json";
import {
  ConflictError,
  InvalidTokenDocumentError,
  NotFoundError,
  createTokenDocumentService,
  type Actor,
} from "./service";
import { getCollaborationRepository } from "./repository";

export function getTokenDocumentService() {
  return createTokenDocumentService(getCollaborationRepository(), sampleData);
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
