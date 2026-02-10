"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTokenStore } from "@/stores/token-store";
import { colorToHex } from "@/lib/contrast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorSwatch } from "./color-swatch";
import { cn } from "@/lib/utils";
import { colord } from "colord";
import type { TokenValue, ColorValue, DesignToken } from "@/types/token";
import { X, GripVertical } from "lucide-react";

import { syncSampleTokensToFile } from "@/lib/sync-sample-tokens";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);

  useEffect(() => {
    if (editingTokenId && editingPosition) {
      setPosition(clampPosition(editingPosition.x, editingPosition.y));
    }
  }, [editingTokenId, editingPosition]);

  useEffect(() => {
    if (!editingTokenId) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingToken(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [editingTokenId, setEditingToken]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditingToken(null);
      }
    },
    [setEditingToken]
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
  const referenceOptions = activeCollection
    ? activeCollection.tokenIds.filter((id) => id !== token.id).map((id) => ({ id, name: tokens[id]?.name ?? id }))
    : [];

  const content = (
    <div
      className="fixed inset-0 z-50"
      role="presentation"
      onClick={handleBackdropClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={containerRef}
        className="rounded-lg border bg-popover text-popover-foreground shadow-lg overflow-hidden min-w-0"
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          width: POPOVER_WIDTH,
        }}
        onClick={(e) => e.stopPropagation()}
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
            onClick={() => setEditingToken(null)}
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
            key={token.id}
            token={token}
            modeId={modeId}
            referenceOptions={referenceOptions}
            isAliasMode={isAliasMode}
            onSaveMeta={(name, description, codeSyntax, referenceTokenId) => {
              if (name.trim() && name !== token.name) updateTokenName(token.id, name.trim());
              if (description !== (token.description ?? "")) updateTokenDescription(token.id, description);
              if (codeSyntax !== undefined) updateTokenCodeSyntax(token.id, codeSyntax);
              const currentAliasId = raw?.type === "ALIAS" ? raw.id : null;
              if (referenceTokenId !== currentAliasId) setTokenAlias(token.id, modeId, referenceTokenId);
              syncSampleTokensToFile();
            }}
          />

          {raw && !isAliasMode && (
            <>
              <SectionLabel>当前值</SectionLabel>
              <EditForm
                tokenId={token.id}
                modeId={modeId}
                raw={raw}
                onSave={(value) => {
                  updateTokenValue(token.id, modeId, value);
                  setEditingToken(null);
                  syncSampleTokensToFile();
                }}
                onCancel={() => setEditingToken(null)}
              />
            </>
          )}
          {isAliasMode && raw?.type === "ALIAS" && (
            <p className="text-xs text-muted-foreground">
              引用自：{tokens[raw.id]?.name ?? raw.id}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1 border-t pt-3">
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setEditingToken(null)}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}

function TokenMetaForm({
  token,
  modeId,
  referenceOptions,
  isAliasMode,
  onSaveMeta,
}: {
  token: DesignToken;
  modeId: string;
  referenceOptions: { id: string; name: string }[];
  isAliasMode: boolean;
  onSaveMeta: (
    name: string,
    description: string,
    codeSyntax: { WEB?: string; ANDROID?: string; iOS?: string },
    referenceTokenId: string | null
  ) => void;
}) {
  const raw = token.rawValues[modeId];
  const currentReferenceId = raw?.type === "ALIAS" ? raw.id : null;

  const [name, setName] = useState(token.name);
  const [description, setDescription] = useState(token.description ?? "");
  const [web, setWeb] = useState(token.codeSyntax?.WEB ?? "");
  const [android, setAndroid] = useState(token.codeSyntax?.ANDROID ?? "");
  const [ios, setIos] = useState(token.codeSyntax?.iOS ?? "");
  const [referenceId, setReferenceId] = useState<string | null>(currentReferenceId);

  // Sync local state when token updates from store (e.g. after saving name)
  useEffect(() => {
    setName(token.name);
    setDescription(token.description ?? "");
    setWeb(token.codeSyntax?.WEB ?? "");
    setAndroid(token.codeSyntax?.ANDROID ?? "");
    setIos(token.codeSyntax?.iOS ?? "");
    setReferenceId(currentReferenceId);
  }, [token.name, token.description, token.codeSyntax, currentReferenceId]);

  const handleSave = () => {
    onSaveMeta(name, description, { WEB: web || undefined, ANDROID: android || undefined, iOS: ios || undefined }, referenceId);
  };

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
            value={web}
            onChange={(e) => setWeb(e.target.value)}
            placeholder="WEB (e.g. --var-name)"
          />
          <Input
            className="font-mono text-xs"
            value={android}
            onChange={(e) => setAndroid(e.target.value)}
            placeholder="ANDROID"
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
        <select
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={referenceId ?? ""}
          onChange={(e) => setReferenceId(e.target.value === "" ? null : e.target.value)}
        >
          <option value="">无</option>
          {referenceOptions.map((opt) => (
            <option key={opt.id} value={opt.id} title={opt.name}>
              {opt.name.length > 36 ? opt.name.slice(0, 33) + "…" : opt.name}
            </option>
          ))}
        </select>
      </div>
      <Button size="sm" className="w-full cursor-pointer" onClick={handleSave}>
        保存元数据
      </Button>
    </div>
  );
}

function EditForm({
  tokenId,
  modeId,
  raw,
  onSave,
  onCancel,
}: {
  tokenId: string;
  modeId: string;
  raw: TokenValue;
  onSave: (value: TokenValue) => void;
  onCancel: () => void;
}) {
  if (raw.type === "COLOR") {
    return (
      <ColorEditForm
        initial={raw.value}
        onSave={(v) => onSave({ type: "COLOR", value: v })}
        onCancel={onCancel}
      />
    );
  }
  if (raw.type === "NUMBER") {
    return (
      <NumberEditForm
        initial={raw.value}
        onSave={(v) => onSave({ type: "NUMBER", value: v })}
        onCancel={onCancel}
      />
    );
  }
  if (raw.type === "STRING") {
    return (
      <StringEditForm
        initial={raw.value}
        onSave={(v) => onSave({ type: "STRING", value: v })}
        onCancel={onCancel}
      />
    );
  }
  if (raw.type === "BOOLEAN") {
    return (
      <BooleanEditForm
        initial={raw.value}
        onSave={(v) => onSave({ type: "BOOLEAN", value: v })}
        onCancel={onCancel}
      />
    );
  }
  return null;
}

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

function ColorEditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: ColorValue;
  onSave: (v: ColorValue) => void;
  onCancel: () => void;
}) {
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

  const handleRgbaChange = (key: keyof ColorValue, value: number) => {
    const next = { ...color, [key]: value };
    setColor(next);
    setHex(colorToHexInput(next));
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = hexToColor(e.target.value);
    setColor(v);
    setHex(colorToHexInput(v));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ColorSwatch color={color} size="md" className="shrink-0" />
        <div className="flex-1 min-w-0 space-y-1">
          <Input
            className="font-mono text-xs h-8"
            value={hex}
            onChange={handleHexChange}
            placeholder="#000000"
          />
          <input
            type="color"
            className="h-8 w-full cursor-pointer rounded border border-border bg-transparent"
            value={colorToHexInput(color)}
            onChange={handlePickerChange}
            aria-label="选色"
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-[10px]">
        {(["r", "g", "b"] as const).map((k) => (
          <div key={k}>
            <label className="text-muted-foreground uppercase">{k}</label>
            <input
              type="range"
              min={0}
              max={1}
              step={1 / 255}
              value={color[k]}
              onChange={(e) => handleRgbaChange(k, parseFloat(e.target.value))}
              className="w-full h-6 accent-primary"
            />
            <span className="font-mono">{Math.round(color[k] * 255)}</span>
          </div>
        ))}
        <div>
          <label className="text-muted-foreground uppercase">A</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={color.a}
            onChange={(e) => handleRgbaChange("a", parseFloat(e.target.value))}
            className="w-full h-6 accent-primary"
          />
          <span className="font-mono">{color.a.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" className="cursor-pointer" onClick={onCancel}>
          取消
        </Button>
        <Button size="sm" className="cursor-pointer" onClick={() => onSave(color)}>
          保存
        </Button>
      </div>
    </div>
  );
}

function NumberEditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: number;
  onSave: (v: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(String(initial));

  const num = parseFloat(value);
  const valid = !Number.isNaN(num);

  return (
    <div className="space-y-3">
      <Input
        type="number"
        className="font-mono"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        step={1}
      />
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" className="cursor-pointer" onClick={onCancel}>
          取消
        </Button>
        <Button
          size="sm"
          className="cursor-pointer"
          onClick={() => valid && onSave(num)}
          disabled={!valid}
        >
          保存
        </Button>
      </div>
    </div>
  );
}

function StringEditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div className="space-y-3">
      <Input
        className="font-mono text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" className="cursor-pointer" onClick={onCancel}>
          取消
        </Button>
        <Button size="sm" className="cursor-pointer" onClick={() => onSave(value)}>
          保存
        </Button>
      </div>
    </div>
  );
}

function BooleanEditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: boolean;
  onSave: (v: boolean) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);

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
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" className="cursor-pointer" onClick={onCancel}>
          取消
        </Button>
        <Button size="sm" className="cursor-pointer" onClick={() => onSave(value)}>
          保存
        </Button>
      </div>
    </div>
  );
}
