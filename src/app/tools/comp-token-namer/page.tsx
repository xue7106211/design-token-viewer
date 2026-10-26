import type { Metadata } from "next";
import { CompTokenNamerPanel } from "@/components/features/comp-token-namer-panel";

export const metadata: Metadata = {
  title: "组件 Token 快速命名 · Design Token Viewer",
  description: "按 miuix_comp 命名规范快速拼接组件 Token 名称",
};

export default function CompTokenNamerPage() {
  return <CompTokenNamerPanel />;
}
