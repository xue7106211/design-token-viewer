import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * 分组路径的统一显示：保留原始名称，不做大小写转换；
 * 父级路径为浅色，末段为正文色。
 */
export function GroupLabel({ group, className }: { group: string; className?: string }) {
  const parts = group.split("/");
  const last = parts.pop();

  return (
    <span className={cn("truncate", className)} title={group}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          <span className="text-muted-foreground">{part}</span>
          <span className="px-1 text-muted-foreground/60">/</span>
        </Fragment>
      ))}
      <span className="font-medium text-foreground">{last}</span>
    </span>
  );
}
