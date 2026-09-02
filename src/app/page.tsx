"use client";

import { useEffect } from "react";
import { useTokenStore } from "@/stores/token-store";
import { AppShell } from "@/components/layout/app-shell";
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

  if (!hasData) {
    if (error) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md space-y-2 text-center">
            <h1 className="text-lg font-semibold">共享 Token 表加载失败</h1>
            <p className="text-sm text-muted-foreground" role="alert">
              {error}
            </p>
          </div>
        </main>
      );
    }

    return <LoadingScreen />;
  }

  return <AppShell />;
}
