"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initializeActorFromIP } from "@/lib/collaboration/client";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void initializeActorFromIP().catch(() => undefined);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        {children}
      </TooltipProvider>
    </ThemeProvider>
  );
}
