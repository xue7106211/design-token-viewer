"use client";

import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { MainView } from "./main-view";
import { TokenInspector } from "@/components/features/token-inspector";
import { SEARCH_INPUT_ID } from "@/components/features/search-bar";
import { useTokenStore } from "@/stores/token-store";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function hasOpenOverlay() {
  return document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]') != null;
}

// 侧边栏收起时搜索框不在 DOM 里，展开后要等一帧才能聚焦
function focusSearchInput(attempt = 0) {
  const input = document.getElementById(SEARCH_INPUT_ID);
  if (input instanceof HTMLInputElement) {
    input.focus();
    input.select();
    return;
  }
  if (attempt < 3) requestAnimationFrame(() => focusSearchInput(attempt + 1));
}

function useShellShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const state = useTokenStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const overlayOpen = hasOpenOverlay() || state.editingTokenId != null;

      const isSearchShortcut =
        (mod && !e.altKey && e.key.toLowerCase() === "k") ||
        (e.key === "/" && !mod && !e.altKey && !isEditableTarget(e.target));
      if (isSearchShortcut) {
        if (overlayOpen) return;
        e.preventDefault();
        if (state.sidebarCollapsed) state.setSidebarCollapsed(false);
        requestAnimationFrame(() => focusSearchInput());
        return;
      }

      if (mod && !e.altKey && e.key === "\\") {
        if (overlayOpen) return;
        e.preventDefault();
        state.setSidebarCollapsed(!state.sidebarCollapsed);
        return;
      }

      if (e.key === "Escape" && !isEditableTarget(e.target) && !overlayOpen && state.inspectorOpen) {
        e.preventDefault();
        state.setInspectorOpen(false);
        state.selectToken(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

export function AppShell() {
  useShellShortcuts();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <h1 className="sr-only">Design Token Viewer</h1>
      <Sidebar />
      <MainView />
      <TokenInspector />
    </div>
  );
}
