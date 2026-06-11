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
const spinnerNames = [
  "braillewave",
  "dna",
  "rain",
  "pulse",
  "sparkle",
  "columns",
  "waverows",
  "checkerboard",
  "helix",
  "fillsweep",
  "diagswipe",
];

function getRandomSpinner() {
  const availableSpinners = spinnerNames
    .map((name) => animationMap[name])
    .filter((spinner): spinner is UnicodeSpinner => Boolean(spinner));

  if (availableSpinners.length === 0) {
    return animationMap.braille ?? fallbackSpinner;
  }

  return availableSpinners[Math.floor(Math.random() * availableSpinners.length)];
}

export function LoadingScreen() {
  const [spinner] = useState(getRandomSpinner);
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
