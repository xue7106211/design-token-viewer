"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, RotateCcw, Save } from "lucide-react";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTokenStore } from "@/stores/token-store";
import { formatTimestamp } from "@/lib/changelog";
import {
  apiRequest,
  withActor,
  type SnapshotsResponse,
} from "@/lib/collaboration/client";
import type { SnapshotRecord, TokenDocumentView } from "@/lib/collaboration/service";
import { cn } from "@/lib/utils";

const SAVE_FEEDBACK_DURATION_MS = 1500;
type SnapshotSaveStatus = "idle" | "saving" | "saved";

export function SnapshotDialog({ collapsed = false }: { collapsed?: boolean }) {
  const revision = useTokenStore((s) => s.revision);
  const loadRemoteDocument = useTokenStore((s) => s.loadRemoteDocument);
  const [open, setOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SnapshotSaveStatus>("idle");
  const saveFeedbackTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (saveFeedbackTimerRef.current !== null) {
      window.clearTimeout(saveFeedbackTimerRef.current);
    }
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest<SnapshotsResponse>("/api/snapshots");
      setSnapshots(response.snapshots);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  const createSnapshot = async () => {
    if (!name.trim() || saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      const snapshot = await apiRequest<SnapshotRecord>("/api/snapshots", {
        method: "POST",
        body: JSON.stringify(withActor({ name, description })),
      });
      setSnapshots((current) => [snapshot, ...current.filter((item) => item.id !== snapshot.id)]);
      setName("");
      setDescription("");
      setSaveStatus("saved");
      if (saveFeedbackTimerRef.current !== null) {
        window.clearTimeout(saveFeedbackTimerRef.current);
      }
      saveFeedbackTimerRef.current = window.setTimeout(() => {
        saveFeedbackTimerRef.current = null;
        setSaveStatus("idle");
      }, SAVE_FEEDBACK_DURATION_MS);
    } catch (error) {
      setSaveStatus("idle");
      window.alert(error instanceof Error ? error.message : "创建快照失败");
    }
  };

  const restoreSnapshot = async (snapshotId: string) => {
    if (revision == null) return;
    const confirmed = window.confirm("恢复快照会覆盖当前共享 Token 表，确定继续吗？");
    if (!confirmed) return;
    try {
      await apiRequest<TokenDocumentView>(`/api/snapshots/${snapshotId}/restore`, {
        method: "POST",
        body: JSON.stringify(withActor({ revision })),
      });
      await loadRemoteDocument();
      setOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "恢复失败");
      await loadRemoteDocument();
    }
  };

  const downloadSnapshot = (snapshot: SnapshotRecord) => {
    const blob = new Blob([JSON.stringify(snapshot.json, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    saveAs(blob, `${snapshot.name || "snapshot"}.json`);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      if (saveFeedbackTimerRef.current !== null) {
        window.clearTimeout(saveFeedbackTimerRef.current);
        saveFeedbackTimerRef.current = null;
      }
      setSaveStatus("idle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground cursor-pointer"
            title="版本快照"
          >
            <Save className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <Save className="h-3.5 w-3.5" />
            <span className="text-xs">版本快照</span>
            {snapshots.length > 0 && (
              <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                {snapshots.length}
              </span>
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="flex max-h-[min(85dvh,48rem)] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-2">
            版本快照
            {revision != null && (
              <span className="font-mono text-xs font-normal tabular-nums text-foreground">
                当前 r{revision}
              </span>
            )}
            {snapshots.length > 0 && (
              <span className="text-xs font-normal tabular-nums text-muted-foreground">
                {snapshots.length} 个
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            保存当前共享 Token 表，或从历史快照恢复。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="快照名称"
          />
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="描述（可选）"
          />
          <Button
            onClick={createSnapshot}
            disabled={!name.trim() || saveStatus === "saving"}
            aria-busy={saveStatus === "saving"}
            aria-live="polite"
          >
            <span className="relative flex h-3.5 w-3.5 items-center justify-center" aria-hidden="true">
              <Save
                className={cn(
                  "absolute h-3.5 w-3.5 transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transform-none motion-reduce:transition-opacity",
                  saveStatus === "saved" ? "scale-[0.96] opacity-0" : "scale-100 opacity-100"
                )}
              />
              <Check
                className={cn(
                  "absolute h-3.5 w-3.5 text-green-500 transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transform-none motion-reduce:transition-opacity",
                  saveStatus === "saved" ? "scale-100 opacity-100" : "scale-[0.96] opacity-0"
                )}
              />
            </span>
            <span>{saveStatus === "saving" ? "保存中…" : saveStatus === "saved" ? "已保存" : "保存"}</span>
          </Button>
        </div>

        <div
          data-testid="snapshot-list"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border"
        >
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">正在加载…</div>
          ) : snapshots.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">暂无快照</div>
          ) : (
            <ul className="divide-y">
              {snapshots.map((snapshot) => (
                <li
                  key={snapshot.id}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium" title={snapshot.name}>
                      {snapshot.name}
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] tabular-nums text-muted-foreground">
                      {formatTimestamp(snapshot.createdAt)} · {snapshot.createdBy}
                    </div>
                    {snapshot.description && (
                      <p
                        className="mt-1 line-clamp-2 text-xs text-muted-foreground [overflow-wrap:anywhere]"
                        title={snapshot.description}
                      >
                        {snapshot.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="下载 JSON"
                      aria-label={`下载 ${snapshot.name}`}
                      onClick={() => downloadSnapshot(snapshot)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="恢复快照"
                      aria-label={`恢复 ${snapshot.name}`}
                      onClick={() => restoreSnapshot(snapshot.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
