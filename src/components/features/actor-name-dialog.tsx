"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getStoredActor, setStoredActorName } from "@/lib/collaboration/client";

export function ActorNameDialog() {
  const [initialActor] = useState(() => getStoredActor());
  const [open, setOpen] = useState(() => initialActor == null);
  const [name, setName] = useState(() => initialActor?.actorName ?? "");

  const handleSave = () => {
    setStoredActorName(name);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>请输入你的名字</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim()) handleSave();
            }}
            placeholder="例如：Mi"
            autoFocus
          />
          <Button className="w-full" onClick={handleSave} disabled={!name.trim()}>
            进入共享 Token 表
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
