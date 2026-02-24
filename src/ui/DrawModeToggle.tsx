/**
 * Pencil icon button to toggle draw mode.
 * Placed below ShapePalette in the toolbar area.
 */
"use client";

import React from "react";
import { useDiagramStore } from "@/stores/diagram-store";

export function DrawModeToggle() {
  const canvasMode = useDiagramStore((s) => s.canvasMode);
  const setCanvasMode = useDiagramStore((s) => s.setCanvasMode);
  const isActive = canvasMode === "draw";

  return (
    <div
      style={{
        position: "absolute",
        top: 248,
        left: 8,
        background: "white",
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)",
        padding: 4,
        zIndex: 300,
      }}
    >
    <button
      title="Draw freehand line (D)"
      onClick={() => setCanvasMode(isActive ? "select" : "draw")}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        color: isActive ? "#fff" : "#374151",
        background: isActive ? "#2563eb" : "transparent",
        transition: "all 0.15s",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M3 17 L14 6 L16 4 C16.5 3.5 17.5 3.5 18 4 C18.5 4.5 18.5 5.5 18 6 L16 8 L5 19 L2 19 L3 17 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={isActive ? "currentColor" : "none"}
          opacity={isActive ? 0.3 : 1}
        />
        <path
          d="M13 7 L15 9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
    </div>
  );
}
