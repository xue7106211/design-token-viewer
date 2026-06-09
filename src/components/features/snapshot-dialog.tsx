"use client";

import { useEffect, useState } from "react";
import { Download, RotateCcw, Save } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTokenStore } from "@/stores/token-store";
import { formatTimestamp } from "@/lib/changelog";
import {
  apiRequest,
  withActor,
  type SnapshotsResponse,
} from "@/lib/collaboration/client";
import type { SnapshotRecord, TokenDocumentView } from "@/lib/collaboration/service";

export function SnapshotDialog({ collapsed = false }: { collapsed?: boolean }) {
  const revision = useTokenStore((s) => s.revision);
  const loadRemoteDocument = useTokenStore((s) => s.loadRemoteDocument);
  const [open, setOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    if (!name.trim()) return;
    await apiRequest<SnapshotRecord>("/api/snapshots", {
      method: "POST",
      body: JSON.stringify(withActor({ name, description })),
    });
    setName("");
    setDescription("");
    await refresh();
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>版本快照</DialogTitle>
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
          <Button onClick={createSnapshot} disabled={!name.trim()}>
            <Save className="h-3.5 w-3.5" />
            保存
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">正在加载...</div>
        ) : snapshots.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无快照</div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: "calc(85vh - 210px)" }}>
            <div className="space-y-2 pb-2">
              {snapshots.map((snapshot) => (
                <div key={snapshot.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{snapshot.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatTimestamp(snapshot.createdAt)} · {snapshot.createdBy}
                      </div>
                      {snapshot.description && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {snapshot.description}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="下载 JSON"
                        onClick={() => downloadSnapshot(snapshot)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="恢复快照"
                        onClick={() => restoreSnapshot(snapshot.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
