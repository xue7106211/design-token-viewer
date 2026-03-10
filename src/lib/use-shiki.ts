"use client";

import { useState, useEffect } from "react";
import type { BundledLanguage } from "shiki";
import type { ExportFormat } from "@/components/features/export-dialog";
import type { CodeFormat } from "@/types/token";

const FORMAT_LANG: Record<ExportFormat, BundledLanguage> = {
  android: "xml",
  css: "css",
  json: "json",
};

let highlighterPromise: Promise<import("shiki").HighlighterGeneric<any, any>> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then((mod) =>
      mod.createHighlighter({
        themes: ["github-light", "github-dark"],
        langs: ["xml", "css", "json"],
      })
    );
  }
  return highlighterPromise;
}

export function useShikiHtml(
  code: string,
  format: CodeFormat | ExportFormat
) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((highlighter) => {
      if (cancelled) return;
      const result = highlighter.codeToHtml(code, {
        lang: FORMAT_LANG[format] ?? "text",
        themes: {
          light: "github-light",
          dark: "github-dark",
        },
      });
      setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [code, format]);

  return html;
}
