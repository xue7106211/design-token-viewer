"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  Copy,
  FolderTree,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  PRESET_COMPONENTS,
  TOKEN_ROLES,
  TOKEN_STATES,
  TOKEN_TYPES,
  COMP_TOKEN_HISTORY_KEY,
  buildCompTokenName,
  buildCompTokenPath,
  formatCompTokenDisplay,
  loadCompTokenHistory,
  pushCompTokenHistory,
  validateCompTokenName,
  type CompTokenHistoryEntry,
  type CompTokenRole,
  type CompTokenState,
  type CompTokenType,
} from "@/lib/comp-token-namer";
import { ThemeToggle } from "@/components/features/theme-toggle";

function FieldLabel({
  children,
  optional = false,
}: {
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="mb-1.5 flex items-baseline gap-1.5 text-xs font-medium text-foreground">
      <span>{children}</span>
      <span className="font-normal text-muted-foreground">
        {optional ? "可选" : "必填"}
      </span>
    </div>
  );
}

function SegmentChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-md border px-2.5 py-1 font-mono text-xs cursor-pointer transition-colors",
            value === opt
              ? "border-foreground/20 bg-foreground text-background"
              : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function CompTokenNamerPanel() {
  const [component, setComponent] = useState("menu");
  const [componentQuery, setComponentQuery] = useState("");
  const [componentOpen, setComponentOpen] = useState(false);
  // 部件字段暂时从 UI 隐藏；命名结构仍支持，固定为空以跳过该段
  const part = "";
  const [type, setType] = useState<CompTokenType>("color");
  const [role, setRole] = useState<CompTokenRole>("fill");
  const [variant, setVariant] = useState("");
  const [state, setState] = useState<CompTokenState>("enabled");
  const [withGroupPrefix, setWithGroupPrefix] = useState(false);
  const [history, setHistory] = useState<CompTokenHistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return loadCompTokenHistory(localStorage.getItem(COMP_TOKEN_HISTORY_KEY));
    } catch {
      return [];
    }
  });
  const [copiedKind, setCopiedKind] = useState<"name" | "path" | "history" | null>(
    null
  );

  const parts = useMemo(
    () => ({ component, part, type, role, variant, state }),
    [component, part, type, role, variant, state]
  );

  const name = useMemo(() => buildCompTokenName(parts), [parts]);
  const path = useMemo(() => buildCompTokenPath(parts), [parts]);
  const display = useMemo(
    () => formatCompTokenDisplay(parts, withGroupPrefix),
    [parts, withGroupPrefix]
  );
  const issues = useMemo(() => validateCompTokenName(parts), [parts]);

  const filteredComponents = useMemo(() => {
    const q = componentQuery.trim().toLowerCase();
    if (!q) return [...PRESET_COMPONENTS];
    return PRESET_COMPONENTS.filter((c) => c.includes(q));
  }, [componentQuery]);

  const persistHistory = useCallback((entries: CompTokenHistoryEntry[]) => {
    setHistory(entries);
    try {
      localStorage.setItem(COMP_TOKEN_HISTORY_KEY, JSON.stringify(entries));
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const rememberCurrent = useCallback(() => {
    persistHistory(
      pushCompTokenHistory(history, {
        name,
        path,
        createdAt: Date.now(),
      })
    );
  }, [history, name, path, persistHistory]);

  const copyText = useCallback(
    async (text: string, kind: "name" | "path" | "history") => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedKind(kind);
        window.setTimeout(() => setCopiedKind(null), 1500);
        if (kind === "name" || kind === "path") {
          rememberCurrent();
        }
      } catch {
        // clipboard may be denied; still allow remembering on explicit copy attempts
      }
    },
    [rememberCurrent]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 cursor-pointer px-2" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              返回
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">组件 Token 快速命名</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              miuix_comp_&#123;组件&#125;_&#123;类型&#125;_&#123;角色&#125;_&#123;变体?&#125;_&#123;状态&#125;
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
          <div>
            <FieldLabel>组件</FieldLabel>
            <DropdownMenu open={componentOpen} onOpenChange={setComponentOpen}>
              <div className="flex gap-2">
                <Input
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                  placeholder="menu / button / …"
                  className="font-mono text-sm"
                  spellCheck={false}
                  autoComplete="off"
                />
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 cursor-pointer"
                    aria-label="选择预置组件"
                  >
                    <ChevronsUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <Input
                  value={componentQuery}
                  onChange={(e) => setComponentQuery(e.target.value)}
                  placeholder="搜索组件…"
                  className="mb-2 h-8"
                  autoFocus
                />
                <div className="max-h-56 overflow-y-auto">
                  {filteredComponents.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-muted-foreground">
                      无匹配预置，可直接在上方输入自定义组件名
                    </p>
                  ) : (
                    filteredComponents.map((c) => (
                      <DropdownMenuItem
                        key={c}
                        className="font-mono text-xs cursor-pointer"
                        onSelect={() => {
                          setComponent(c);
                          setComponentQuery("");
                          setComponentOpen(false);
                        }}
                      >
                        {c}
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <FieldLabel>类型</FieldLabel>
            <SegmentChips options={TOKEN_TYPES} value={type} onChange={setType} />
          </div>

          <div>
            <FieldLabel>角色</FieldLabel>
            <SegmentChips options={TOKEN_ROLES} value={role} onChange={setRole} />
          </div>

          <div>
            <FieldLabel optional>变体</FieldLabel>
            <Input
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              placeholder="留空为默认款；如 primary / grouped"
              className="font-mono text-sm"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div>
            <FieldLabel>状态</FieldLabel>
            <SegmentChips options={TOKEN_STATES} value={state} onChange={setState} />
          </div>
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">实时预览</h2>
            <button
              type="button"
              role="switch"
              aria-checked={withGroupPrefix}
              onClick={() => setWithGroupPrefix((v) => !v)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs cursor-pointer transition-colors",
                withGroupPrefix
                  ? "border-foreground/20 bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:bg-accent"
              )}
            >
              <FolderTree className="h-3.5 w-3.5" />
              Figma 分组前缀
            </button>
          </div>

          <div className="rounded-lg bg-muted/60 px-3 py-3">
            <code className="block break-all font-mono text-sm leading-relaxed">
              {display || "—"}
            </code>
          </div>

          {issues.length > 0 && (
            <ul className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200">
              {issues.map((issue) => (
                <li key={issue.code}>⚠ {issue.message}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="cursor-pointer sm:flex-1"
              onClick={() => void copyText(name, "name")}
            >
              {copiedKind === "name" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              复制名字
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer sm:flex-1"
              onClick={() => void copyText(path, "path")}
            >
              {copiedKind === "path" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              复制带分组路径
            </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">最近生成</h2>
            <span className="text-xs text-muted-foreground">最多 20 条，保存在本机</span>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">复制一次后会出现在这里</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {history.map((entry) => (
                <li key={`${entry.name}-${entry.createdAt}`}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-accent/50"
                    onClick={() =>
                      void copyText(withGroupPrefix ? entry.path : entry.name, "history")
                    }
                    title="点击复制"
                  >
                    <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <code className="break-all font-mono text-xs leading-relaxed">
                      {withGroupPrefix ? entry.path : entry.name}
                    </code>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {copiedKind === "history" && (
            <p className="text-xs text-muted-foreground">已复制到剪贴板</p>
          )}
        </section>
      </main>
    </div>
  );
}
