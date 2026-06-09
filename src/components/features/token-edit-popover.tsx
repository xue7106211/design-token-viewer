"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useTokenStore } from "@/stores/token-store";
import { colorToHex } from "@/lib/contrast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorSwatch } from "./color-swatch";
import { cn } from "@/lib/utils";
import { colord } from "colord";
import type { TokenValue, ColorValue, DesignToken } from "@/types/token";
import { X, GripVertical } from "lucide-react";

import { getAndroidResourceName } from "@/lib/code-generators/android";
import { toCSSVarName } from "@/lib/code-generators/css";
import { stripCodeSyntaxPrefix } from "@/lib/code-generators/utils";

const POPOVER_TRANSITION = { duration: 0.25, ease: [0.165, 0.84, 0.44, 1] as const };

const POPOVER_WIDTH = 360;
const PADDING = 12;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function clampPosition(x: number, y: number): { x: number; y: number } {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const x2 = Math.max(PADDING, Math.min(vw - POPOVER_WIDTH - PADDING, x));
  const y2 = Math.max(PADDING, Math.min(vh - 300 - PADDING, y));
  return { x: x2, y: y2 };
}

export function TokenEditPopover() {
  const editingTokenId = useTokenStore((s) => s.editingTokenId);
  const editingPosition = useTokenStore((s) => s.editingPosition);
  const tokens = useTokenStore((s) => s.tokens);
  const activeCollection = useTokenStore((s) => s.activeCollection);
  const activeModeId = useTokenStore((s) => s.activeModeId);
  const setEditingToken = useTokenStore((s) => s.setEditingToken);
  const updateTokenValue = useTokenStore((s) => s.updateTokenValue);
  const updateTokenName = useTokenStore((s) => s.updateTokenName);
  const updateTokenDescription = useTokenStore((s) => s.updateTokenDescription);
  const updateTokenCodeSyntax = useTokenStore((s) => s.updateTokenCodeSyntax);
  const setTokenAlias = useTokenStore((s) => s.setTokenAlias);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const metaFormRef = useRef<TokenMetaFormHandle>(null);
  const valueFormRef = useRef<ValueFormHandle>(null);
  const didDragRef = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (editingTokenId && editingPosition) {
      setPosition(clampPosition(editingPosition.x, editingPosition.y));
    }
  }, [editingTokenId, editingPosition]);

  const startClose = useCallback(() => {
    if (reduceMotion) {
      setEditingToken(null);
      return;
    }
    setIsExiting(true);
  }, [reduceMotion, setEditingToken]);

  const handleCloseComplete = useCallback(() => {
    setIsExiting(false);
    setEditingToken(null);
  }, [setEditingToken]);

  useEffect(() => {
    if (!editingTokenId) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") startClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [editingTokenId, startClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        startClose();
      }
    },
    [startClose]
  );

  const handleHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = position.x;
      const startTop = position.y;

      const onMove = (moveEvent: MouseEvent) => {
        didDragRef.current = true;
        setPosition(
          clampPosition(
            startLeft + (moveEvent.clientX - startX),
            startTop + (moveEvent.clientY - startY)
          )
        );
      };
      const onUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      setIsDragging(true);
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [position.x, position.y]
  );

  if (!editingTokenId) return null;

  const token = tokens[editingTokenId];
  if (!token) return null;

  const modeId = activeModeId ?? Object.keys(token.rawValues)[0];
  const raw = token.rawValues[modeId];
  const isAliasMode = raw?.type === "ALIAS";
  const modes = activeCollection?.modes ?? [];
  const hasMultipleModes = modes.length > 1;
  const referenceOptions = Object.values(tokens)
    .filter((t) => t.id !== token.id)
    .map((t) => ({
      id: t.id,
      name: t.name,
      group: t.group || "(root)",
      collection: t.collection,
    }));

  const duration = reduceMotion ? 0 : POPOVER_TRANSITION.duration;
  const content = (
    <div
      className="fixed inset-0 z-50"
      role="presentation"
      onClick={handleBackdropClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <motion.div
        ref={containerRef}
        className="rounded-lg border bg-popover text-popover-foreground shadow-lg overflow-hidden min-w-0"
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          width: POPOVER_WIDTH,
          transformOrigin: "0 0",
        }}
        onClick={(e) => e.stopPropagation()}
        initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
        animate={
          reduceMotion
            ? { opacity: 1, scale: 1 }
            : isExiting
              ? { opacity: 0, scale: 0.96 }
              : { opacity: 1, scale: 1 }
        }
        transition={{ duration, ease: POPOVER_TRANSITION.ease }}
        onAnimationComplete={isExiting ? handleCloseComplete : undefined}
      >
        <div
          className={cn(
            "flex h-10 shrink-0 items-center gap-2 border-b px-3 select-none",
            "cursor-grab active:cursor-grabbing"
          )}
          style={{ cursor: isDragging ? "grabbing" : undefined }}
          onMouseDown={handleHeaderMouseDown}
        >
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-xs font-medium truncate min-w-0 flex-1" title={token.name}>
            {token.path[token.path.length - 1]}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 cursor-pointer pointer-events-auto"
            onClick={startClose}
            aria-label="关闭"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="p-3 space-y-4 max-h-[70vh] overflow-y-auto">
          {hasMultipleModes && (
            <div className="flex flex-wrap gap-1">
              {modes.map((m) => (
                <span
                  key={m.modeId}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-medium",
                    m.modeId === modeId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {m.name}
                </span>
              ))}
            </div>
          )}

          <TokenMetaForm
            ref={metaFormRef}
            key={token.id}
            token={token}
            modeId={modeId}
            referenceOptions={referenceOptions}
            isAliasMode={isAliasMode}
            onSaveMeta={async (name, description, codeSyntax, referenceTokenId) => {
              if (name.trim() && name !== token.name) await updateTokenName(token.id, name.trim());
              if (description !== (token.description ?? "")) await updateTokenDescription(token.id, description);
              if (codeSyntax !== undefined) await updateTokenCodeSyntax(token.id, codeSyntax);
              const currentAliasId = raw?.type === "ALIAS" ? raw.id : null;
              if (referenceTokenId !== currentAliasId) await setTokenAlias(token.id, modeId, referenceTokenId);
            }}
          />

          {raw && !isAliasMode && (
            <>
              <SectionLabel>当前值</SectionLabel>
              <EditForm
                ref={valueFormRef}
                tokenId={token.id}
                modeId={modeId}
                raw={raw}
              />
            </>
          )}
          {isAliasMode && raw?.type === "ALIAS" && (
            <p className="text-xs text-muted-foreground">
              引用自：{tokens[raw.id]?.name ?? raw.id}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1 border-t pt-3">
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={startClose}>
              关闭
            </Button>
            <Button size="sm" className="cursor-pointer" onClick={async () => {
              await metaFormRef.current?.save();
              const newValue = valueFormRef.current?.getValue();
              if (newValue) {
                await updateTokenValue(token.id, modeId, newValue);
              }
            }}>
              保存
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}

export interface ValueFormHandle {
  getValue: () => TokenValue | null;
}

export interface TokenMetaFormHandle {
  save: () => Promise<void>;
}

const TokenMetaForm = React.forwardRef<
  TokenMetaFormHandle,
  {
    token: DesignToken;
    modeId: string;
    referenceOptions: { id: string; name: string; group: string; collection: string }[];
    isAliasMode: boolean;
    onSaveMeta: (
      name: string,
      description: string,
      codeSyntax: { WEB?: string; ANDROID?: string; iOS?: string },
      referenceTokenId: string | null
    ) => Promise<void>;
  }
>(function TokenMetaForm({ token, modeId, referenceOptions, isAliasMode, onSaveMeta }, ref) {
  const tokens = useTokenStore((s) => s.tokens);
  const raw = token.rawValues[modeId];
  const currentReferenceId = raw?.type === "ALIAS" ? raw.id : null;

  // Auto-generated code syntax names (derived from token name by code generators)
  const autoWebName = toCSSVarName(stripCodeSyntaxPrefix(token.name));
  const autoAndroidName = getAndroidResourceName(token, modeId);

  // Resolve effective codeSyntax: own > referenced target > auto-generated
  const resolveField = (field: "WEB" | "ANDROID" | "iOS", autoValue?: string) => {
    if (token.codeSyntax?.[field]) return token.codeSyntax[field];
    if (currentReferenceId && tokens[currentReferenceId]?.codeSyntax?.[field]) {
      return tokens[currentReferenceId].codeSyntax![field];
    }
    return autoValue ?? "";
  };

  const [name, setName] = useState(token.name);
  const [description, setDescription] = useState(token.description ?? "");
  const [web, setWeb] = useState(resolveField("WEB", autoWebName));
  const [android, setAndroid] = useState(resolveField("ANDROID", autoAndroidName));
  const [ios, setIos] = useState(resolveField("iOS"));
  const [referenceId, setReferenceId] = useState<string | null>(currentReferenceId);
  const [referenceQuery, setReferenceQuery] = useState("");
  const [referenceFocused, setReferenceFocused] = useState(false);

  // Sync local state when token updates from store (e.g. after saving name)
  useEffect(() => {
    const syncWeb = toCSSVarName(stripCodeSyntaxPrefix(token.name));
    const syncAndroid = getAndroidResourceName(token, modeId);
    const syncField = (field: "WEB" | "ANDROID" | "iOS", autoVal?: string) => {
      if (token.codeSyntax?.[field]) return token.codeSyntax[field];
      const refId = raw?.type === "ALIAS" ? raw.id : null;
      if (refId && tokens[refId]?.codeSyntax?.[field]) return tokens[refId].codeSyntax![field];
      return autoVal ?? "";
    };
    setName(token.name);
    setDescription(token.description ?? "");
    setWeb(syncField("WEB", syncWeb));
    setAndroid(syncField("ANDROID", syncAndroid));
    setIos(syncField("iOS"));
    setReferenceId(currentReferenceId);
    const current = referenceOptions.find((opt) => opt.id === currentReferenceId);
    setReferenceQuery(current?.name ?? "");
    setReferenceFocused(false);
  }, [token.name, token.description, token.codeSyntax, currentReferenceId, referenceOptions, tokens, modeId, raw]);

  const filteredReferences = referenceOptions.filter((opt) => {
    const q = referenceQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      opt.name.toLowerCase().includes(q) ||
      opt.group.toLowerCase().includes(q) ||
      opt.collection.toLowerCase().includes(q)
    );
  });

  const groupedReferences = (() => {
    const groups = new Map<string, typeof filteredReferences>();
    for (const opt of filteredReferences) {
      const groupKey = `${opt.collection} / ${opt.group || "(root)"}`;
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(opt);
    }
    for (const opts of groups.values()) {
      opts.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  })();

  const handleSave = async () => {
    await onSaveMeta(name, description, { WEB: web || undefined, ANDROID: android || undefined, iOS: ios || undefined }, referenceId);
  };

  useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <SectionLabel>Token 名称</SectionLabel>
        <Input
          className="font-mono text-xs"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="group/subgroup/token"
        />
      </div>
      <div className="space-y-1.5">
        <SectionLabel>描述</SectionLabel>
        <textarea
          className="min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="可选"
          rows={2}
        />
      </div>
      <div className="space-y-1.5">
        <SectionLabel>Code Syntax</SectionLabel>
        <div className="space-y-1.5">
          <Input
            className="font-mono text-xs"
            value={android}
            onChange={(e) => setAndroid(e.target.value)}
            placeholder="ANDROID"
          />
          <Input
            className="font-mono text-xs"
            value={web}
            onChange={(e) => setWeb(e.target.value)}
            placeholder="CSS (e.g. --var-name)"
          />
          <Input
            className="font-mono text-xs"
            value={ios}
            onChange={(e) => setIos(e.target.value)}
            placeholder="iOS"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <SectionLabel>引用 (Reference)</SectionLabel>
        <Input
          className="text-xs"
          value={referenceFocused ? referenceQuery : (referenceOptions.find((opt) => opt.id === referenceId)?.name ?? "")}
          onChange={(e) => setReferenceQuery(e.target.value)}
          onFocus={() => {
            setReferenceFocused(true);
            if (!referenceQuery && referenceId) {
              const current = referenceOptions.find((opt) => opt.id === referenceId);
              setReferenceQuery(current?.name ?? "");
            }
          }}
          onBlur={() => {
            setReferenceFocused(false);
            if (referenceId == null && referenceQuery.trim() === "") {
              setReferenceQuery("");
            }
          }}
          placeholder="搜索 Token（名称/分组/Collection）"
        />
        {referenceFocused && (
          <div className="max-h-56 overflow-auto rounded-md border border-input bg-transparent">
            <button
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-xs font-mono hover:bg-accent",
                referenceId == null && "bg-accent"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setReferenceId(null);
                setReferenceQuery("");
              }}
            >
              无
            </button>
            {groupedReferences.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">没有匹配的 Token</div>
            ) : (
              groupedReferences.map(([groupName, opts]) => (
                <div key={groupName} className="border-t border-border/60 first:border-t-0">
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">
                    {groupName}
                  </div>
                  {opts.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={cn(
                        "w-full px-3 py-2 text-left text-xs font-mono hover:bg-accent",
                        referenceId === opt.id && "bg-accent"
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setReferenceId(opt.id);
                        setReferenceQuery(opt.name);
                      }}
                      title={opt.name}
                    >
                      {opt.name.length > 40 ? opt.name.slice(0, 37) + "…" : opt.name}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const EditForm = React.forwardRef<
  ValueFormHandle,
  {
    tokenId: string;
    modeId: string;
    raw: TokenValue;
  }
>(function EditForm({ raw }, ref) {
  if (raw.type === "COLOR") {
    return <ColorEditForm ref={ref} initial={raw.value as ColorValue} />;
  }
  if (raw.type === "NUMBER") {
    return <NumberEditForm ref={ref} initial={raw.value} />;
  }
  if (raw.type === "STRING") {
    return <StringEditForm ref={ref} initial={raw.value} />;
  }
  if (raw.type === "BOOLEAN") {
    return <BooleanEditForm ref={ref} initial={raw.value} />;
  }
  return null;
});

function colorToHexInput(c: ColorValue): string {
  const hex = colorToHex(c).toUpperCase();
  if (c.a < 1) return hex;
  return hex.slice(0, 7);
}

function hexToColor(hex: string): ColorValue {
  const parsed = colord(hex);
  const rgb = parsed.toRgb();
  return {
    r: rgb.r / 255,
    g: rgb.g / 255,
    b: rgb.b / 255,
    a: rgb.a,
  };
}

const ColorEditForm = React.forwardRef<
  ValueFormHandle,
  { initial: ColorValue }
>(function ColorEditForm({ initial }, ref) {
  const [hex, setHex] = useState(() => colorToHexInput(initial));
  const [color, setColor] = useState<ColorValue>(initial);

  const syncFromHex = useCallback((hexStr: string) => {
    const c = colord(hexStr);
    if (!c.isValid()) return;
    const rgb = c.toRgb();
    setColor({
      r: rgb.r / 255,
      g: rgb.g / 255,
      b: rgb.b / 255,
      a: rgb.a,
    });
  }, []);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setHex(v);
    syncFromHex(v.startsWith("#") ? v : `#${v}`);
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = hexToColor(e.target.value);
    setColor(v);
    setHex(colorToHexInput(v));
  };

  useImperativeHandle(ref, () => ({
    getValue: () => ({ type: "COLOR" as const, value: color }),
  }), [color]);

  return (
    <div className="flex items-center gap-2">
      <ColorSwatch color={color} size="sm" className="shrink-0" />
      <Input
        className="font-mono text-xs h-8 flex-1 min-w-0"
        value={hex}
        onChange={handleHexChange}
        placeholder="#000000"
      />
    </div>
  );
});

const NumberEditForm = React.forwardRef<
  ValueFormHandle,
  { initial: number }
>(function NumberEditForm({ initial }, ref) {
  const [value, setValue] = useState(String(initial));

  const num = parseFloat(value);
  const valid = !Number.isNaN(num);

  useImperativeHandle(ref, () => ({
    getValue: () => valid ? { type: "NUMBER" as const, value: num } : null,
  }), [valid, num]);

  return (
    <div className="space-y-3">
      <Input
        type="number"
        className="font-mono"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        step={1}
      />
    </div>
  );
});

const StringEditForm = React.forwardRef<
  ValueFormHandle,
  { initial: string }
>(function StringEditForm({ initial }, ref) {
  const [value, setValue] = useState(initial);

  useImperativeHandle(ref, () => ({
    getValue: () => ({ type: "STRING" as const, value }),
  }), [value]);

  return (
    <div className="space-y-3">
      <Input
        className="font-mono text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
});

const BooleanEditForm = React.forwardRef<
  ValueFormHandle,
  { initial: boolean }
>(function BooleanEditForm({ initial }, ref) {
  const [value, setValue] = useState(initial);

  useImperativeHandle(ref, () => ({
    getValue: () => ({ type: "BOOLEAN" as const, value }),
  }), [value]);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => setValue(e.target.checked)}
          className="rounded border-input accent-primary"
        />
        <span className="text-sm">{value ? "true" : "false"}</span>
      </label>
    </div>
  );
});
