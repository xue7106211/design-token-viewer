"use client";

import { useTokenStore } from "@/stores/token-store";
import { TOKEN_DOCUMENTS } from "@/lib/collaboration/client";
import { cn } from "@/lib/utils";

/**
 * 顶部 Token 表切换器：在 HyperOS3 / HyperOS4 两套独立的 Token 表之间切换。
 * 切换会触发 token-store.setActiveDocument，重新从服务端加载对应文档。
 */
export function DocumentSwitcher({ className }: { className?: string }) {
  const activeDocumentId = useTokenStore((s) => s.activeDocumentId);
  const setActiveDocument = useTokenStore((s) => s.setActiveDocument);
  const isLoading = useTokenStore((s) => s.isLoading);

  return (
    <div className={cn("flex h-8 items-center gap-1 rounded-lg border bg-muted/50 p-0.5", className)}>
      {[...TOKEN_DOCUMENTS].reverse().map((doc) => (
        <button
          key={doc.id}
          onClick={() => setActiveDocument(doc.id)}
          disabled={isLoading}
          className={cn(
            "h-7 flex-1 rounded-md px-3 text-xs font-medium cursor-pointer",
            "transition-all duration-200 ease disabled:cursor-not-allowed disabled:opacity-60",
            activeDocumentId === doc.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {doc.label}
        </button>
      ))}
    </div>
  );
}
