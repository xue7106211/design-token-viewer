"use client";

import { useState, useEffect } from "react";
import type { ExportFormat } from "@/components/features/export-dialog";
import type { CodeFormat } from "@/types/token";

const FORMAT_LANG: Record<string, string> = {
  android: "xml",
  css: "css",
  json: "json",
};

type ShikiHighlighter = {
  codeToHtml: (
    code: string,
    options: {
      lang: string;
      themes: { light: string; dark: string };
    }
  ) => string;
};

let highlighterPromise: Promise<ShikiHighlighter | null> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki/bundle/web").then((mod) =>
      mod.createHighlighter({
        themes: ["github-light", "github-dark"],
        langs: ["xml", "css", "json"],
      })
    ).catch((err) => {
      // 加载失败时重置，允许下次重试
      console.warn("[shiki] chunk 加载失败，将回退到纯文本:", err);
      highlighterPromise = null;
      return null;
    });
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
      if (cancelled || !highlighter) return;
      try {
        const result = highlighter.codeToHtml(code, {
          lang: FORMAT_LANG[format] ?? "text",
          themes: {
            light: "github-light",
            dark: "github-dark",
          },
        });
        setHtml(result);
      } catch {
        // 高亮失败时保持空字符串，组件会回退到纯文本
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code, format]);

  return html;
}
