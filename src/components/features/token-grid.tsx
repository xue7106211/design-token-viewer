"use client";

import { useTokenStore } from "@/stores/token-store";
import { TokenCard } from "./token-card";

export function TokenGrid() {
  const filteredTokenIds = useTokenStore((s) => s.filteredTokenIds);
  const tokens = useTokenStore((s) => s.tokens);

  if (filteredTokenIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">没有匹配的令牌</p>
      </div>
    );
  }

  // Group tokens by their group path
  const groups = new Map<string, string[]>();
  for (const id of filteredTokenIds) {
    const token = tokens[id];
    if (!token) continue;
    const group = token.group || "(root)";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(id);
  }

  return (
    <div className="space-y-8 p-6">
      {Array.from(groups.entries()).map(([groupName, tokenIds]) => (
        <div key={groupName}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {groupName}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {tokenIds.map((id) => {
              const token = tokens[id];
              if (!token) return null;
              return <TokenCard key={id} token={token} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
