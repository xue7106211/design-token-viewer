"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useTokenStore } from "@/stores/token-store";
import { getAliasChain } from "@/lib/token-resolver";
import { generateTokenCode } from "@/lib/code-generators";
import { colorToHex, colorToRGB, colorToHSL, contrastRatio, getWCAGLevel } from "@/lib/contrast";
import { ColorSwatch } from "./color-swatch";
import { NumberPreview } from "./number-preview";
import { CodeOutput } from "./code-output";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight, Link2, Eye, GripVertical, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ColorValue } from "@/types/token";

const INSPECTOR_WIDTH_MIN = 280;
const INSPECTOR_WIDTH_MAX = 560;

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
  const resizeStartRef = useRef({ x: 0, width: 0 });

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeStartRef.current = { x: e.clientX, width: inspectorWidth };
      setIsResizing(true);
    },
    [inspectorWidth]
  );

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const { x, width } = resizeStartRef.current;
      const delta = x - e.clientX;
      const next = Math.min(INSPECTOR_WIDTH_MAX, Math.max(INSPECTOR_WIDTH_MIN, width + delta));
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
  }, [isResizing, setInspectorWidth]);

  if (!inspectorOpen || !selectedTokenId) return null;

  const token = tokens[selectedTokenId];
  if (!token) return null;

  const modeId = activeModeId ?? Object.keys(token.resolvedValues)[0];
  const resolved = token.resolvedValues[modeId];
  const code = generateTokenCode(token, codeFormat, modeId);

  // Alias chain
  const aliasChain = getAliasChain(token.id, modeId, tokens);

  // Reverse references
  const referencedBy = token.referencedBy
    .map((id) => tokens[id])
    .filter(Boolean);

  return (
    <div
      className="relative flex h-full flex-col border-l bg-background shrink-0"
      style={{ width: inspectorWidth }}
    >
      {/* 左侧拖拽条：向左拖变宽，向右拖变窄 */}
      <div
        role="separator"
        aria-label="调整 Inspector 宽度"
        onMouseDown={handleResizeStart}
        className={cn(
          "absolute left-0 top-0 z-10 h-full w-1.5 -translate-x-1/2 cursor-col-resize",
          "flex items-center justify-center select-none",
          "transition-[background] duration-150 ease-out",
          "hover:bg-primary/20 active:bg-primary/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        style={{ touchAction: "none" }}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/50 pointer-events-none" />
      </div>

      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4 py-2.5">
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

      <ScrollArea className="min-h-0 flex-1">
        <div className="min-w-0 space-y-5 p-4">
          {/* Current Value Preview */}
          <Section title="当前值">
            {resolved?.type === "COLOR" && (
              <div className="space-y-3">
                <ColorSwatch color={resolved.value} size="lg" />
                <div className="space-y-1.5 text-xs font-mono">
                  <Row label="HEX" value={colorToHex(resolved.value).toUpperCase()} />
                  <Row label="RGB" value={colorToRGB(resolved.value)} />
                  <Row label="HSL" value={colorToHSL(resolved.value)} />
                </div>
                {/* Contrast info */}
                <div className="space-y-1.5 mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">对比度</p>
                  <ContrastInfo color={resolved.value} against={WHITE} label="白色背景" />
                  <ContrastInfo color={resolved.value} against={BLACK} label="黑色背景" />
                </div>
              </div>
            )}
            {resolved?.type === "NUMBER" && (
              <NumberPreview value={resolved.value} name={token.name} />
            )}
            {resolved?.type === "STRING" && (
              <p className="text-sm font-mono">{resolved.value}</p>
            )}
            {resolved?.type === "BOOLEAN" && (
              <Badge variant={resolved.value ? "default" : "secondary"}>
                {resolved.value ? "true" : "false"}
              </Badge>
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
                          "flex items-center justify-between rounded-lg border p-2.5",
                          mode.modeId === activeModeId && "border-primary/30 bg-primary/5"
                        )}
                      >
                        <span className="text-xs font-medium">{mode.name}</span>
                        {modeResolved.type === "COLOR" && (
                          <ColorSwatch color={modeResolved.value} size="sm" showLabel />
                        )}
                        {modeResolved.type === "NUMBER" && (
                          <span className="text-xs font-mono">{modeResolved.value}px</span>
                        )}
                        {modeResolved.type === "STRING" && (
                          <span className="text-xs font-mono truncate max-w-[120px]">{modeResolved.value}</span>
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
              <Section title="引用链路">
                <div className="flex flex-col gap-1">
                  {aliasChain.map((item, idx) => {
                    const chainToken = tokens[item.id];
                    const chainResolved = chainToken?.resolvedValues[modeId];
                    const isColor = chainResolved?.type === "COLOR";
                    return (
                      <div key={item.id}>
                        {idx > 0 && (
                          <div className="flex justify-center py-0.5">
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => selectToken(item.id)}
                          className={cn(
                            "flex items-center gap-2 min-w-0 w-full text-left rounded-md px-1 py-0.5 -mx-1 hover:bg-accent/50 transition-colors",
                            item.id === token.id && "bg-accent/30"
                          )}
                        >
                          {isColor && chainResolved && (
                            <ColorSwatch
                              color={(chainResolved as { type: "COLOR"; value: ColorValue }).value}
                              size="sm"
                              className="shrink-0"
                            />
                          )}
                          <span
                            className={cn(
                              "text-xs font-mono truncate text-foreground",
                              item.id === token.id && "font-medium"
                            )}
                            title={item.name}
                          >
                            {item.name.length > 28 ? item.name.slice(0, 25) + "…" : item.name}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex justify-center py-0.5">
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    {resolved.type === "COLOR" && (
                      <ColorSwatch color={resolved.value} size="sm" className="shrink-0" />
                    )}
                    <span className="text-xs font-mono text-foreground">
                      {resolved.type === "COLOR"
                        ? colorToHex(resolved.value).toUpperCase()
                        : resolved.type === "NUMBER"
                          ? `${resolved.value}px`
                          : String(resolved.value)}
                    </span>
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
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-mono cursor-pointer hover:bg-accent transition-colors"
                    >
                      <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{ref.name}</span>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
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
    <div className="flex items-center justify-between rounded-md border px-2.5 py-1.5">
      <div className="flex items-center gap-2">
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
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
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
