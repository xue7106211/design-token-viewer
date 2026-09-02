"use client";

import { useEffect, useState } from "react";
import * as unicodeAnimations from "unicode-animations";

type UnicodeSpinner = {
  frames: string[];
  interval: number;
};

type UnicodeAnimationsModule = Record<string, UnicodeSpinner> & {
  default?: Record<string, UnicodeSpinner>;
  spinners?: Record<string, UnicodeSpinner>;
};

const fallbackSpinner: UnicodeSpinner = {
  frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  interval: 80,
};

const animationModule = unicodeAnimations as UnicodeAnimationsModule;
const animationMap = animationModule.spinners ?? animationModule.default ?? animationModule;
function getInitialSpinner() {
  return animationMap.braillewave ?? fallbackSpinner;
}

export function LoadingScreen() {
  // 服务端和客户端的首次渲染必须使用同一个 spinner，避免 hydration 文本不一致。
  const spinner = getInitialSpinner();
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % spinner.frames.length);
    }, spinner.interval);

    return () => window.clearInterval(timer);
  }, [spinner.frames.length, spinner.interval]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      <div className="flex flex-col items-center gap-3 text-xs" role="status" aria-live="polite">
        <span
          aria-hidden="true"
          className="min-w-20 text-center font-mono text-4xl leading-none text-foreground"
        >
          {spinner.frames[frameIndex]}
        </span>
        <span>正在加载共享 Token 表...</span>
      </div>
    </main>
  );
}
