"use client";

import { Tldraw } from "tldraw";
import { customShapeUtils, customTools } from "@/lib/shape-registry";
import { ShapePalette } from "@/ui/ShapePalette";
import { SyncBridge } from "./SyncBridge";

export default function CanvasPanel() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      <Tldraw
        shapeUtils={customShapeUtils}
        tools={customTools}
      >
        <ShapePalette />
        <SyncBridge />
      </Tldraw>
    </div>
  );
}
