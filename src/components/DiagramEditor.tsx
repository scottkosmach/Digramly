"use client";

import dynamic from "next/dynamic";
import {
  Panel,
  Group,
  Separator,
} from "react-resizable-panels";
import { CodePanel } from "./CodePanel";

// Konva requires browser APIs — load client-side only
const CanvasPanel = dynamic(() => import("./CanvasPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="text-sm text-zinc-400">Loading canvas...</div>
    </div>
  ),
});

export function DiagramEditor() {
  return (
    <div className="h-screen w-screen">
      <Group orientation="horizontal" id="diagramly-panels" style={{ height: "100%", width: "100%" }}>
        {/* Left: Code Editor */}
        <Panel defaultSize="35%" minSize="15%" maxSize="60%" id="code-panel">
          <CodePanel />
        </Panel>

        <Separator />

        {/* Right: Canvas */}
        <Panel defaultSize="65%" minSize="40%" id="canvas-panel">
          <CanvasPanel />
        </Panel>
      </Group>
    </div>
  );
}
