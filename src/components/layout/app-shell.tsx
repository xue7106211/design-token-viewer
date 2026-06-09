"use client";

import { Sidebar } from "./sidebar";
import { MainView } from "./main-view";
import { TokenInspector } from "@/components/features/token-inspector";
import { ActorNameDialog } from "@/components/features/actor-name-dialog";

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ActorNameDialog />
      <Sidebar />
      <MainView />
      <TokenInspector />
    </div>
  );
}
