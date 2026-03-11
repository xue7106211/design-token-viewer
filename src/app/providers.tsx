"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useChangeLogStore } from "@/stores/changelog-store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useChangeLogStore.getState().fetchAndCacheIP();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        {children}
      </TooltipProvider>
    </ThemeProvider>
  );
}
