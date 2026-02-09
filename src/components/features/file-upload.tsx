"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, FileJson, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTokenStore } from "@/stores/token-store";
import sampleData from "@/data/sample-tokens.json";

export function FileUpload() {
  const loadJSON = useTokenStore((s) => s.loadJSON);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const success = loadJSON(json);
        if (!success) {
          setError("无法识别的文件格式。请上传 Figma 原生导出或 Variables2CSS 格式的 JSON 文件。");
        }
      } catch {
        setError("JSON 解析失败，请检查文件格式。");
      }
    },
    [loadJSON]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleLoadSample = useCallback(() => {
    setError(null);
    loadJSON(sampleData);
  }, [loadJSON]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <FileJson className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Design Token Viewer</h1>
          <p className="text-sm text-muted-foreground">
            上传 Figma Variables 导出的 JSON 文件，可视化浏览和导出设计令牌
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex cursor-pointer flex-col items-center justify-center
            rounded-xl border-2 border-dashed p-10
            transition-colors duration-200 ease
            ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/50"
            }
          `}
        >
          <Upload
            className={`mb-3 h-8 w-8 transition-colors duration-200 ease ${
              isDragging ? "text-primary" : "text-muted-foreground/50"
            }`}
          />
          <p className="text-sm font-medium">
            {isDragging ? "松开以上传文件" : "拖拽 JSON 文件到此处"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            或点击选择文件 · 支持 Figma 原生导出和 Variables2CSS 格式
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Sample Data */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">或者</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full cursor-pointer gap-2"
          onClick={handleLoadSample}
        >
          <Sparkles className="h-4 w-4" />
          加载示例数据
        </Button>
      </div>
    </div>
  );
}
