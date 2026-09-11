"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useTokenStore } from "@/stores/token-store";
import { getAliasChain } from "@/lib/token-resolver";
import { generateTokenCode } from "@/lib/code-generators";
import { colorToHex, colorToHexWithAlpha, colorToRGB, colorToHSL, contrastRatio, getWCAGLevel } from "@/lib/contrast";
import { ColorSwatch } from "./color-swatch";
import { NumberPreview } from "./number-preview";
import { CodeOutput } from "./code-output";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { X, Link2, Eye, GripVertical, ArrowDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ColorValue } from "@/types/token";

const INSPECTOR_WIDTH_MIN = 280;
const INSPECTOR_WIDTH_MAX = 560;
const INSPECTOR_VIEWPORT_GUTTER = 48;

const WHITE: ColorValue = { r: 1, g: 1, b: 1, a: 1 };
const BLACK: ColorValue = { r: 0, g: 0, b: 0, a: 1 };

export function TokenInspector() {
  const selectedTokenId = useTokenStore((s) => s.selectedTokenId);
  const tokens = useTokenStore((s) => s.tokens);
  const activeCollection = useTokenStore((s) => s.activeCollection);
  const activeModeId = useTokenStore((s) => s.activeModeId);
  const selectToken = useTokenStore((s) => s.selectToken);
  const inspectorOpen = useTokenStore((s) => s.inspectorOpen);
  const setInspectorOpen = useTokenStore((s) => s.setInspectorOpen);
  const codeFormat = useTokenStore((s) => s.codeFormat);
  const inspectorWidth = useTokenStore((s) => s.inspectorWidth);
  const setInspectorWidth = useTokenStore((s) => s.setInspectorWidth);

  const [isResizing, setIsResizing] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? INSPECTOR_WIDTH_MAX : window.innerWidth
  );
  const resizeStartRef = useRef({ x: 0, width: 0 });

  const maxUsableInspectorWidth = Math.max(
    INSPECTOR_WIDTH_MIN,
    Math.min(INSPECTOR_WIDTH_MAX, viewportWidth - INSPECTOR_VIEWPORT_GUTTER)
  );
  const effectiveInspectorWidth = Math.min(inspectorWidth, maxUsableInspectorWidth);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeStartRef.current = { x: e.clientX, width: effectiveInspectorWidth };
      setIsResizing(true);
    },
    [effectiveInspectorWidth]
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const { x, width } = resizeStartRef.current;
      const delta = x - e.clientX;
      const next = Math.min(maxUsableInspectorWidth, Math.max(INSPECTOR_WIDTH_MIN, width + delta));
      setInspectorWidth(next);
    };
    const onEnd = () => setIsResizing(false);
    document.body.classList.add("select-none");
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      document.body.classList.remove("select-none");
      document.body.style.cursor = "";
    };
  }, [isResizing, maxUsableInspectorWidth, setInspectorWidth]);

  if (!inspectorOpen || !selectedTokenId) return null;

  const token = tokens[selectedTokenId];
  if (!token) return null;

  const modeId = activeModeId ?? Object.keys(token.resolvedValues)[0];
  const resolved = token.resolvedValues[modeId];
  const code = generateTokenCode(token, codeFormat, modeId, tokens);
  const description = token.description?.trim();
  const scopes = resolved?.type === "NUMBER" ? token.scopes?.filter(Boolean) ?? [] : [];

  // Alias chain
  const aliasChain = getAliasChain(token.id, modeId, tokens);

  // Reverse references
  const referencedBy = token.referencedBy
    .map((id) => tokens[id])
    .filter(Boolean);

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-l bg-background shrink-0 overflow-hidden",
        isResizing && "shadow-[-8px_0_24px_-18px_hsl(var(--foreground))]"
      )}
      style={{ width: effectiveInspectorWidth, minWidth: effectiveInspectorWidth, maxWidth: effectiveInspectorWidth }}
    >
      {/* 左侧拖拽条：向左拖变宽，向右拖变窄 */}
      <div
        role="separator"
        aria-label="调整 Inspector 宽度"
        onMouseDown={handleResizeStart}
        className={cn(
          "absolute left-0 top-0 z-10 h-full w-2 -translate-x-1/2 cursor-col-resize",
          "flex items-center justify-center select-none",
          "transition-[background,width] duration-150 ease-out",
          "hover:bg-primary/20 active:bg-primary/30",
          isResizing && "w-3 bg-primary/25",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        style={{ touchAction: "none" }}
      >
        <GripVertical className={cn("h-3 w-3 text-muted-foreground/50 pointer-events-none", isResizing && "text-primary")} />
        {isResizing && (
          <span className="absolute left-2 top-3 rounded-md border bg-popover px-1.5 py-0.5 text-[10px] font-mono text-popover-foreground shadow-sm">
            {effectiveInspectorWidth}px
          </span>
        )}
      </div>

      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{token.path[token.path.length - 1]}</h3>
          <p className="text-[10px] font-mono text-muted-foreground truncate">{token.name}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 cursor-pointer"
          onClick={() => {
            setInspectorOpen(false);
            selectToken(null);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 min-w-0 flex-1 w-full" viewportClassName="!overflow-x-hidden">
        <div className="min-w-0 w-full space-y-4 overflow-hidden p-3">
          {/* Current Value Preview */}
          <Section title="当前值">
            {resolved?.type === "COLOR" && (
              <div className="min-w-0 space-y-3">
                <div className="min-w-0 [&>button]:max-w-full [&>div]:max-w-full">
                  <ColorSwatch color={resolved.value} size="lg" />
                </div>
                <div className="min-w-0 space-y-1.5 text-xs font-mono">
                  <Row label="HEX" value={colorToHexWithAlpha(resolved.value).toUpperCase()} />
                  <Row label="RGB" value={colorToRGB(resolved.value)} />
                  <Row label="HSL" value={colorToHSL(resolved.value)} />
                </div>
              </div>
            )}
            {resolved?.type === "NUMBER" && (
              <div className="space-y-3">
                <NumberPreview value={resolved.value} name={token.name} />
                {scopes.length > 0 && <ScopeList scopes={scopes} />}
              </div>
            )}
            {resolved?.type === "STRING" && (
              <p className="text-sm font-mono">{resolved.value}</p>
            )}
            {resolved?.type === "BOOLEAN" && (
              <Badge variant={resolved.value ? "default" : "secondary"}>
                {resolved.value ? "true" : "false"}
              </Badge>
            )}
            {description && <Description value={description} />}
            {resolved?.type === "COLOR" && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">对比度</p>
                <ContrastInfo color={resolved.value} against={WHITE} label="白色背景" />
                <ContrastInfo color={resolved.value} against={BLACK} label="黑色背景" />
              </div>
            )}
          </Section>

          <Separator />

          {/* Multi-mode comparison */}
          {activeCollection && activeCollection.modes.length > 1 && (
            <>
              <Section title="模式对比">
                <div className="space-y-2">
                  {activeCollection.modes.map((mode) => {
                    const modeResolved = token.resolvedValues[mode.modeId];
                    if (!modeResolved) return null;
                    return (
                      <div
                        key={mode.modeId}
                        className={cn(
                          "flex min-w-0 items-center justify-between gap-2 rounded-lg border p-2.5",
                          mode.modeId === activeModeId && "border-primary/30 bg-primary/5"
                        )}
                      >
                        <span className="shrink-0 text-xs font-medium">{mode.name}</span>
                        {modeResolved.type === "COLOR" && (
                          <div className="min-w-0 flex-1 overflow-hidden [&>button]:max-w-full [&>div]:min-w-0 [&>div]:justify-end [&_span]:min-w-0 [&_span]:truncate">
                            <ColorSwatch color={modeResolved.value} size="sm" showLabel />
                          </div>
                        )}
                        {modeResolved.type === "NUMBER" && (
                          <span className="min-w-0 truncate text-xs font-mono">{modeResolved.value}px</span>
                        )}
                        {modeResolved.type === "STRING" && (
                          <span className="min-w-0 truncate text-xs font-mono">{modeResolved.value}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
              <Separator />
            </>
          )}

          {/* Alias Chain */}
          {aliasChain.length > 1 && resolved && (
            <>
              <Section title="引用链路" icon={<Link2 className="h-3 w-3" />}>
                <div className="min-w-0 rounded-xl border bg-muted/20 p-2">
                  <div className="space-y-1.5">
                  {aliasChain.map((item, idx) => {
                    const chainToken = tokens[item.id];
                    const chainResolved = chainToken?.resolvedValues[modeId];
                    const isColor = chainResolved?.type === "COLOR";
                    return (
                      <div key={item.id} className="relative">
                        {idx > 0 && (
                          <div className="flex items-center justify-center py-0.5 text-muted-foreground">
                            <div className="h-px flex-1 bg-border" />
                            <ArrowDown className="mx-2 h-3.5 w-3.5" aria-hidden />
                            <div className="h-px flex-1 bg-border" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => selectToken(item.id)}
                          className={cn(
                            "grid min-w-0 w-full grid-cols-[1.5rem_1.5rem_minmax(0,1fr)] items-start gap-x-2 rounded-lg border bg-background px-2.5 py-2 text-left transition-[background-color,border-color,transform] duration-150 ease-out",
                            "hover:border-primary/25 hover:bg-accent/45 active:scale-[0.99]",
                            item.id === token.id && "border-primary/35 bg-primary/[0.045]"
                          )}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-md border bg-muted/35 text-[10px] font-semibold text-muted-foreground tabular-nums">
                            {idx + 1}
                          </span>
                          {isColor && chainResolved ? (
                            <ColorSwatch color={(chainResolved as { type: "COLOR"; value: ColorValue }).value} size="sm" className="[&>div]:!h-6 [&>div]:!w-6" />
                          ) : (
                            <span className="h-6 w-6 rounded-md border bg-muted" />
                          )}
                          <span className="min-w-0 space-y-0.5 overflow-hidden">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className={cn("min-w-0 truncate text-xs font-mono text-foreground", item.id === token.id && "font-semibold")} title={item.name}>
                                {chainToken?.path[chainToken.path.length - 1] ?? item.name}
                              </span>
                              {item.id === token.id && (
                                <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium leading-none text-primary">
                                  当前
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-[10px] font-mono text-muted-foreground" title={item.name}>
                              {item.name}
                            </span>
                          </span>
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-center py-0.5 text-muted-foreground">
                    <div className="h-px flex-1 bg-border" />
                    <ArrowDown className="mx-2 h-3.5 w-3.5" aria-hidden />
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid min-w-0 grid-cols-[1.5rem_1.5rem_minmax(0,1fr)] items-center gap-x-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.055] px-2.5 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    {resolved.type === "COLOR" ? (
                      <ColorSwatch color={resolved.value} size="sm" className="[&>div]:!h-6 [&>div]:!w-6" />
                    ) : (
                      <span className="h-6 w-6 rounded-md border bg-muted" />
                    )}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="text-[10px] font-medium text-muted-foreground">Resolved value</div>
                      <div className="truncate text-xs font-mono text-foreground">{formatResolvedValue(resolved)}</div>
                    </div>
                  </div>
                  </div>
                </div>
              </Section>
              <Separator />
            </>
          )}

          {/* Referenced By */}
          {referencedBy.length > 0 && (
            <>
              <Section title={`被引用 (${referencedBy.length})`} icon={<Link2 className="h-3 w-3" />}>
                <div className="space-y-1">
                  {referencedBy.map((ref) => (
                    <button
                      key={ref.id}
                      onClick={() => selectToken(ref.id)}
                      className="flex min-w-0 w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-mono cursor-pointer hover:bg-accent transition-colors"
                    >
                      <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="min-w-0 truncate">{ref.name}</span>
                    </button>
                  ))}
                </div>
              </Section>
              <Separator />
            </>
          )}

          {/* Code Output */}
          <Section title="代码">
            <CodeOutput code={code} />
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

function ScopeList({ scopes }: { scopes: string[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Scope</p>
      <div className="flex flex-wrap gap-1.5">
        {scopes.map((scope) => (
          <Badge key={scope} variant="secondary" className="h-5 px-1.5 text-[9px] font-mono font-medium">
            {scope}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function Description({ value }: { value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">描述</p>
      <p className="whitespace-pre-wrap break-words rounded-md bg-muted/35 px-2.5 py-2 text-xs leading-relaxed text-foreground/85">
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-0.5 rounded-md bg-muted/25 px-2 py-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="min-w-0 break-all text-left text-foreground" title={value}>{value}</span>
    </div>
  );
}

function formatResolvedValue(resolved: { type: string; value: unknown }) {
  if (resolved.type === "COLOR") {
    return colorToHexWithAlpha(resolved.value as ColorValue).toUpperCase();
  }
  if (resolved.type === "NUMBER") {
    return `${resolved.value}px`;
  }
  return String(resolved.value);
}

function ContrastInfo({
  color,
  against,
  label,
}: {
  color: ColorValue;
  against: ColorValue;
  label: string;
}) {
  const ratio = contrastRatio(color, against);
  const levels = getWCAGLevel(ratio);
  const bgHex = colorToHex(against);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 rounded-md border px-2.5 py-1.5 min-[360px]:grid-cols-[minmax(0,1fr)_auto] min-[360px]:items-center">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="h-5 w-5 rounded border"
          style={{ backgroundColor: bgHex }}
        >
          <div
            className="flex h-full w-full items-center justify-center text-[8px] font-bold"
            style={{ color: colorToHex(color) }}
          >
            A
          </div>
        </div>
        <span className="min-w-0 truncate text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex min-w-0 items-center gap-1.5 min-[360px]:shrink-0">
        <span className="text-[10px] font-mono font-medium">{ratio.toFixed(1)}:1</span>
        <Badge
          variant={levels.aa ? "default" : "secondary"}
          className={cn(
            "h-4 px-1 text-[8px]",
            levels.aa ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"
          )}
        >
          {levels.aaa ? "AAA" : levels.aa ? "AA" : "Fail"}
        </Badge>
      </div>
    </div>
  );
}
