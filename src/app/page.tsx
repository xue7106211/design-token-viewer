"use client";

import { useEffect } from "react";
import { useTokenStore } from "@/stores/token-store";
import { AppShell } from "@/components/layout/app-shell";
import { FileUpload } from "@/components/features/file-upload";
import sampleData from "@/data/sample-tokens.json";

export default function Home() {
  const rawJSON = useTokenStore((s) => s.rawJSON);
  const collections = useTokenStore((s) => s.collections);
  const loadJSON = useTokenStore((s) => s.loadJSON);
  const hasData = collections.length > 0;

  // After rehydration: if we have rawJSON but no tokens (e.g. old persist format),
  // re-parse so tokens/collections/tree are restored
  useEffect(() => {
    if (rawJSON && !hasData) {
      loadJSON(rawJSON);
    }
  }, [rawJSON, hasData, loadJSON]);

  // 默认数据源：无任何数据时自动加载示例，保证打开页面即有 Collection 展示
  useEffect(() => {
    if (!hasData && rawJSON == null) {
      loadJSON(sampleData);
    }
  }, [hasData, rawJSON, loadJSON]);

  if (!hasData) {
    return <FileUpload />;
  }

  return <AppShell />;
}
