import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import type { ServerLogEntry, TokenDocumentRecord } from "./service";
import { createFileCollaborationRepository } from "./repository";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

function document(revision: number): TokenDocumentRecord {
  return {
    id: "doc-1",
    name: "Tokens",
    currentJson: { revision },
    revision,
    updatedAt: revision,
  };
}

function log(id: string, timestamp: number): ServerLogEntry {
  return {
    id,
    documentId: "doc-1",
    timestamp,
    ip: "127.0.0.1",
    actorName: "Mi",
    actorClientId: "client-1",
    changeType: "update_value",
  };
}

describe("file collaboration repository", () => {
  it("commits a document save and its log in one write, and keeps the previous file when the transaction throws", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "token-logs-"));
    directories.push(directory);
    const repo = createFileCollaborationRepository(path.join(directory, "store.json"));
    await repo.saveDocument(document(1));

    await expect(
      repo.transact(async (tx) => {
        const current = await tx.getDocument("doc-1");
        await tx.saveDocument(document((current?.revision ?? 0) + 1));
        throw new Error("log failed");
      })
    ).rejects.toThrow("log failed");

    expect((await repo.getDocument("doc-1"))?.revision).toBe(1);
    await expect(repo.listLogs("doc-1")).resolves.toEqual({ entries: [], total: 0 });
  });

  it("serializes transactions and returns logs newest first with a total", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "token-logs-"));
    directories.push(directory);
    const repo = createFileCollaborationRepository(path.join(directory, "store.json"));
    await repo.saveDocument(document(1));

    await Promise.all([
      repo.transact(async (tx) => {
        const current = await tx.getDocument("doc-1");
        await tx.saveDocument(document((current?.revision ?? 0) + 1));
        await tx.addLog(log("log-a", 10));
      }),
      repo.transact(async (tx) => {
        const current = await tx.getDocument("doc-1");
        await tx.saveDocument(document((current?.revision ?? 0) + 1));
        await tx.addLog(log("log-b", 20));
      }),
    ]);

    expect((await repo.getDocument("doc-1"))?.revision).toBe(3);
    await expect(repo.listLogs("doc-1", 1)).resolves.toEqual({
      entries: [expect.objectContaining({ id: expect.stringMatching(/^log-/) })],
      total: 2,
    });
    const page = await repo.listLogs("doc-1");
    expect(page.total).toBe(2);
    expect(page.entries.map((entry) => entry.timestamp)).toEqual([20, 10]);
  });
});
