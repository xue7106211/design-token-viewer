---
files:
  - "src/lib/collaboration/**/*.ts"
  - "src/app/api/**/route.ts"
  - "src/stores/token-store.ts"
  - "src/types/changelog.ts"
  - "src/lib/changelog.ts"
  - "src/lib/db/schema.ts"
  - "drizzle/**/*.sql"
  - "!**/*.test.ts"
---

# 协作文档写入：revision、变更日志与文档隔离

所有修改服务端 Token 文档（`currentJson`）或快照的操作，都必须满足以下条件：

1. **在一次 `repository.transact` 中完成**：读取文档 → `assertFreshRevision` → 保存（`revision + 1`）→ `addLog`。编辑类操作应复用 `service.ts` 中的 `updateDocument`；导入、快照创建/恢复等单独实现时也必须遵循同样顺序。不能在事务外写日志，也不能先写文档、再在另一个事务里写日志——AGENTS.md 约定日志写入失败时文档修改必须回滚。
2. **每次写入只增加一次 revision、只记一条日志**。批量操作（如 `move-to-group` 同时改组和重排序）不得拆成多次 `updateDocument`。
3. **有对应的 `ChangeType`**：新增操作时同时更新 `src/types/changelog.ts` 的 `ChangeType`、`src/lib/changelog.ts` 的中文标签，以及 `changelog-dialog.tsx` 中需要的展示分支；不得复用语义不符的已有类型。
4. **Route Handler 透传 revision、actor 与文档 id**：使用 `readRevision(body)`、`actorFromRequest(request, body)` 和 `getTokenDocumentService(documentIdFromRequest(request))`，不得硬编码文档 id 或跳过 revision。前端 `token-store.ts` 的 action 必须携带当前 `revision` 与 actor，并用响应的 `TokenDocumentView` 更新状态。
5. **按 `document_id` 隔离**：日志、快照的读取、导出与恢复只作用于当前文档；恢复快照时必须校验 `snapshot.documentId === document.id`，不匹配返回 404，且不改文档、不写日志。

违反这些条件会导致并发编辑互相覆盖、变更日志缺失或与文档不一致，或者 HyperOS3 / HyperOS4 的数据相互串改。修复提交 `1c5891d`（补齐 rename / reorder 日志）和 `b4a7470`（日志与保存同事务、校验快照归属）都源于此类问题。

## 示例

错误——绕过 revision 校验，并在事务外单独写日志：

```ts
async renameCollection(input: { collectionId: string; name: string; actor: Actor }) {
  const document = await ensureDocument();
  const parsed = parseTokenJSON(document.currentJson);
  // ...修改 parsed...
  await repository.saveDocument({ ...document, currentJson: rebuildRawJSON(parsed.collections, parsed.tokens) });
  await repository.addLog({ /* changeType: "rename_group" */ });
}
```

正确——经由 `updateDocument`，带 revision，并使用新增的专用 `ChangeType`：

```ts
renameCollection(input: { collectionId: string; name: string; revision: number; actor: Actor }) {
  return updateDocument(input.revision, input.actor, "rename_collection", (data) => {
    const collection = data.collections.find((item) => item.id === input.collectionId);
    if (!collection) throw new NotFoundError("Collection not found");
    const oldName = collection.name;
    collection.name = input.name.trim();
    return { oldValue: oldName, newValue: collection.name, meta: { collectionId: collection.id } };
  });
},
```
