"use client";

import { useEffect } from "react";
import { useTokenStore } from "@/stores/token-store";
import { AppShell } from "@/components/layout/app-shell";
import { FileUpload } from "@/components/features/file-upload";
import { LoadingScreen } from "@/components/features/loading-screen";
import { shouldLoadRemoteDocument } from "@/lib/collaboration/loading-state";

export default function Home() {
  const collections = useTokenStore((s) => s.collections);
  const isLoading = useTokenStore((s) => s.isLoading);
  const error = useTokenStore((s) => s.error);
  const loadRemoteDocument = useTokenStore((s) => s.loadRemoteDocument);
  const hasData = collections.length > 0;

  useEffect(() => {
    if (shouldLoadRemoteDocument({ hasData, isLoading, error })) {
      loadRemoteDocument();
    }
  }, [error, hasData, isLoading, loadRemoteDocument]);

  if (isLoading && !hasData) {
    return <LoadingScreen />;
  }

  if (!hasData) {
    return <FileUpload error={error} />;
  }

  return <AppShell />;
}
