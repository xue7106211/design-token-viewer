"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTokenStore } from "@/stores/token-store";

export function SearchBar() {
  const searchQuery = useTokenStore((s) => s.searchQuery);
  const setSearchQuery = useTokenStore((s) => s.setSearchQuery);

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="搜索令牌..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-8 pl-8 pr-8 text-xs"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
