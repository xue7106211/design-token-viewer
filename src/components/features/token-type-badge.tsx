import { CaseSensitive, Code, Hash, Palette, ToggleLeft, Type, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TOKEN_TYPE_META: Record<string, { label: string; icon: LucideIcon; className: string }> = {
  COLOR: { label: "颜色", icon: Palette, className: "text-sky-700 dark:text-sky-300" },
  NUMBER: { label: "数值", icon: Hash, className: "text-violet-700 dark:text-violet-300" },
  STRING: { label: "字符串", icon: Type, className: "text-amber-700 dark:text-amber-300" },
  BOOLEAN: { label: "布尔", icon: ToggleLeft, className: "text-emerald-700 dark:text-emerald-300" },
  TYPOGRAPHY: { label: "文字样式", icon: CaseSensitive, className: "text-rose-700 dark:text-rose-300" },
};

/**
 * Returns the single type shared by every token in a group, or null when the group is mixed.
 * Uniform groups show the type once on the group header instead of on every row/card.
 */
export function getUniformTokenType(types: Iterable<string | undefined>): string | null {
  let uniform: string | null = null;
  for (const type of types) {
    if (!type) continue;
    if (uniform === null) uniform = type;
    else if (uniform !== type) return null;
  }
  return uniform;
}

export function TokenTypeBadge({ type, className }: { type: string; className?: string }) {
  const meta = TOKEN_TYPE_META[type] ?? { label: type, icon: Code, className: "text-muted-foreground" };
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 text-[11px] font-medium",
        meta.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}
