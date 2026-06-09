"use client";

import { useEffect } from "react";
import { useTokenStore } from "@/stores/token-store";
import { AppShell } from "@/components/layout/app-shell";
import { FileUpload } from "@/components/features/file-upload";

export default function Home() {
  const collections = useTokenStore((s) => s.collections);
  const isLoading = useTokenStore((s) => s.isLoading);
  const error = useTokenStore((s) => s.error);
  const loadRemoteDocument = useTokenStore((s) => s.loadRemoteDocument);
  const hasData = collections.length > 0;

  useEffect(() => {
    if (!hasData && !isLoading) {
      loadRemoteDocument();
    }
  }, [hasData, isLoading, loadRemoteDocument]);

  if (isLoading && !hasData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        正在加载共享 Token 表...
      </div>
    );
  }

  if (!hasData) {
    return <FileUpload error={error} />;
  }

  return <AppShell />;
}
