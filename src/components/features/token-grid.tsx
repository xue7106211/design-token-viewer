"use client";

import { useTokenStore } from "@/stores/token-store";
import { TokenCard } from "./token-card";
import { orderTokenIdsByTree } from "@/lib/tree-builder";
import { GroupLabel } from "./group-label";
import { TokenTypeBadge, getUniformTokenType } from "./token-type-badge";

export function TokenGrid() {
  const filteredTokenIds = useTokenStore((s) => s.filteredTokenIds);
  const tokens = useTokenStore((s) => s.tokens);
  const tree = useTokenStore((s) => s.tree);

  if (filteredTokenIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">没有匹配的 Token</p>
      </div>
    );
  }

  // Group tokens by their group path
  const groups = new Map<string, string[]>();
  for (const id of orderTokenIdsByTree(tree, filteredTokenIds)) {
    const token = tokens[id];
    if (!token) continue;
    const group = token.group || "(root)";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(id);
  }

  return (
    <div className="space-y-7 p-5 lg:p-6">
      {Array.from(groups.entries()).map(([groupName, tokenIds]) => {
        const groupType = getUniformTokenType(tokenIds.map((id) => tokens[id]?.type));
        return (
        <div key={groupName}>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="min-w-0 truncate text-xs">
              <GroupLabel group={groupName} />
            </h3>
            <span className="rounded-full border bg-muted/40 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
              {tokenIds.length}
            </span>
            {groupType && <TokenTypeBadge type={groupType} />}
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {tokenIds.map((id) => {
              const token = tokens[id];
              if (!token) return null;
              return <TokenCard key={id} token={token} showType={!groupType} />;
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}
