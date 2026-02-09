"use client";

import { useTokenStore } from "@/stores/token-store";
import { AppShell } from "@/components/layout/app-shell";
import { FileUpload } from "@/components/features/file-upload";

export default function Home() {
  const collections = useTokenStore((s) => s.collections);
  const hasData = collections.length > 0;

  if (!hasData) {
    return <FileUpload />;
  }

  return <AppShell />;
}
