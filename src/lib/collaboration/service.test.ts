import { describe, expect, it } from "vitest";
import sampleData from "@/data/sample-tokens.json";
import type { TokenValue } from "@/types/token";
import {
  ConflictError,
  createMemoryCollaborationRepository,
  createTokenDocumentService,
} from "./service";

const actor = {
  actorName: "Mi",
  actorClientId: "client-1",
  ip: "127.0.0.1",
};

describe("token document collaboration service", () => {
  it("initializes a shared token document from sample JSON", async () => {
    const repo = createMemoryCollaborationRepository();
    const service = createTokenDocumentService(repo, sampleData);

    const document = await service.getDocument();

    expect(document.name).toBe("HyperOS Tokens");
    expect(document.revision).toBe(1);
    expect(document.currentJson).toEqual(sampleData);
  });

  it("backfills missing seed metadata for an existing matching token", async () => {
    const repo = createMemoryCollaborationRepository();
    const seed = {
      collections: [{ id: "col_1", name: "Reference", modes: [{ modeId: "light", name: "Light" }], variableIds: ["var_1"] }],
      variables: {
        var_1: {
          id: "var_1",
          name: "space/card",
          type: "NUMBER",
          description: "Card spacing",
          scopes: ["GAP"],
          valuesByMode: { light: { type: "NUMBER", value: 16 } },
        },
      },
    };
    await repo.saveDocument({
      id: "default",
      name: "HyperOS Tokens",
      currentJson: {
        ...seed,
        variables: {
          var_1: { ...seed.variables.var_1, description: undefined, scopes: undefined },
        },
      },
      revision: 3,
      updatedAt: 0,
    });

    const document = await createTokenDocumentService(repo, seed).getDocument();

    expect(document.revision).toBe(3);
    expect(document.tokens.var_1.description).toBe("Card spacing");
    expect(document.tokens.var_1.scopes).toEqual(["GAP"]);
  });

  it("updates a token value, increments revision, and writes an audit log", async () => {
    const repo = createMemoryCollaborationRepository();
    const service = createTokenDocumentService(repo, sampleData);
    const document = await service.getDocument();
    const firstToken = Object.values(document.tokens)[0];
    const modeId = Object.keys(firstToken.rawValues)[0];
    const nextValue: TokenValue = { type: "NUMBER", value: 12 };

    const updated = await service.updateTokenValue({
      tokenId: firstToken.id,
      modeId,
      value: nextValue,
      revision: document.revision,
      actor,
    });

    expect(updated.revision).toBe(document.revision + 1);
    expect(updated.tokens[firstToken.id].rawValues[modeId]).toEqual(nextValue);

    const logs = await service.getChangeLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      changeType: "update_value",
      tokenId: firstToken.id,
      tokenName: firstToken.name,
      actorName: actor.actorName,
      actorClientId: actor.actorClientId,
      ip: actor.ip,
    });
  });

  it("reorders collection tokens with a reorder audit log", async () => {
    const repo = createMemoryCollaborationRepository();
    const service = createTokenDocumentService(repo, sampleData);
    const document = await service.getDocument();
    const collection = document.collections.find((item) => item.tokenIds.length > 1);
    expect(collection).toBeDefined();
    if (!collection) return;
    const nextOrder = [collection.tokenIds[1], collection.tokenIds[0], ...collection.tokenIds.slice(2)];

    const updated = await service.reorderTokens({
      collectionId: collection.id,
      tokenIds: nextOrder,
      revision: document.revision,
      actor,
    });

    expect(updated.collections.find((item) => item.id === collection.id)?.tokenIds).toEqual(nextOrder);

    const logs = await service.getChangeLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      changeType: "reorder",
      actorName: actor.actorName,
      meta: {
        collectionId: collection.id,
        collectionName: collection.name,
        count: collection.tokenIds.length,
      },
    });
  });

  it("renames a group with one rename_group audit log", async () => {
    const repo = createMemoryCollaborationRepository();
    const service = createTokenDocumentService(repo, sampleData);
    const document = await service.getDocument();
    const token = Object.values(document.tokens).find((item) => item.group);
    expect(token).toBeDefined();
    if (!token) return;
    const oldPath = token.group;
    const newPath = `${oldPath}-renamed`;

    const updated = await service.renameGroup({
      oldPath,
      newPath,
      revision: document.revision,
      actor,
    });

    expect(Object.values(updated.tokens).some((item) => item.name.startsWith(`${newPath}/`))).toBe(true);

    const logs = await service.getChangeLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      changeType: "rename_group",
      oldValue: oldPath,
      newValue: newPath,
    });
  });

  it("rejects stale edits when the revision has changed", async () => {
    const repo = createMemoryCollaborationRepository();
    const service = createTokenDocumentService(repo, sampleData);
    const document = await service.getDocument();
    const firstToken = Object.values(document.tokens)[0];

    await service.updateTokenDescription({
      tokenId: firstToken.id,
      description: "fresh change",
      revision: document.revision,
      actor,
    });

    await expect(
      service.updateTokenDescription({
        tokenId: firstToken.id,
        description: "stale change",
        revision: document.revision,
        actor,
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("creates immutable snapshots and restores them as a new revision", async () => {
    const repo = createMemoryCollaborationRepository();
    const service = createTokenDocumentService(repo, sampleData);
    const document = await service.getDocument();
    const firstToken = Object.values(document.tokens)[0];

    const snapshot = await service.createSnapshot({
      name: "Baseline",
      description: "Before edits",
      actor,
    });

    const edited = await service.updateTokenDescription({
      tokenId: firstToken.id,
      description: "changed after snapshot",
      revision: document.revision,
      actor,
    });

    expect(edited.tokens[firstToken.id].description).toBe("changed after snapshot");

    const restored = await service.restoreSnapshot({
      snapshotId: snapshot.id,
      revision: edited.revision,
      actor,
    });

    expect(restored.revision).toBe(edited.revision + 1);
    expect(restored.tokens[firstToken.id].description).toBe(firstToken.description);

    const snapshots = await service.getSnapshots();
    expect(snapshots[0].json).toEqual(sampleData);
  });
});
