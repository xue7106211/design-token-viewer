"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ContextMenuItem } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

export const HOLD_TO_CONFIRM_DURATION_MS = 2000;

export function HoldToConfirmMenuItem({
  children,
  onConfirm,
  className,
  disabled = false,
}: {
  children: ReactNode;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<number | null>(null);
  const itemRef = useRef<HTMLElement | null>(null);
  const confirmedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelHold = useCallback(() => {
    clearTimer();
    confirmedRef.current = false;
    setIsHolding(false);
  }, [clearTimer]);

  const startHold = useCallback(() => {
    if (disabled || timerRef.current !== null) return;
    setIsHolding(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      confirmedRef.current = true;
      setIsHolding(false);
      itemRef.current?.click();
    }, HOLD_TO_CONFIRM_DURATION_MS);
  }, [disabled]);

  useEffect(() => clearTimer, [clearTimer]);

  return (
    <ContextMenuItem
      variant="destructive"
      disabled={disabled}
      data-holding={isHolding ? "true" : "false"}
      aria-label="按住 2 秒删除 Token"
      className={cn(
        "relative cursor-pointer overflow-hidden transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.98] motion-reduce:active:scale-[0.99]",
        "[&>svg]:relative [&>svg]:z-10",
        className
      )}
      onSelect={(event) => {
        if (confirmedRef.current) {
          confirmedRef.current = false;
          onConfirm();
          return;
        }
        event.preventDefault();
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        itemRef.current = event.currentTarget;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        startHold();
      }}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        itemRef.current = event.currentTarget;
        if (!event.repeat) startHold();
      }}
      onKeyUp={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        cancelHold();
      }}
      onBlur={cancelHold}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 origin-left scale-x-0 bg-destructive/12",
          "transition-transform duration-200 ease-[var(--ease-out)]",
          "motion-reduce:scale-x-100 motion-reduce:opacity-0 motion-reduce:transition-opacity",
          isHolding &&
            "scale-x-100 duration-[2000ms] ease-linear motion-reduce:opacity-100"
        )}
      />
      <span className="relative z-10">{children}</span>
      <span className="relative z-10 ml-auto text-[10px] tabular-nums opacity-70">
        按住 2 秒
      </span>
    </ContextMenuItem>
  );
}
