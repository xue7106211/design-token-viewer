"use client";

import { useEffect } from "react";
import { useTokenStore } from "@/stores/token-store";
import { AppShell } from "@/components/layout/app-shell";
import { FileUpload } from "@/components/features/file-upload";

export default function Home() {
  const rawJSON = useTokenStore((s) => s.rawJSON);
  const collections = useTokenStore((s) => s.collections);
  const loadJSON = useTokenStore((s) => s.loadJSON);
  const hasData = collections.length > 0;

  // After rehydration: if we have rawJSON but no tokens (e.g. old persist format),
  // re-parse so tokens/collections/tree are restored (onRehydrateStorage set() can be dropped with sync storage)
  useEffect(() => {
    if (rawJSON && !hasData) {
      loadJSON(rawJSON);
    }
  }, [rawJSON, hasData, loadJSON]);

  if (!hasData) {
    return <FileUpload />;
  }

  return <AppShell />;
}
