"use client";

import { Sidebar } from "./sidebar";
import { MainView } from "./main-view";
import { TokenInspector } from "@/components/features/token-inspector";

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <MainView />
      <TokenInspector />
    </div>
  );
}
