/**
 * Floating toolbar for selected edge properties.
 * Arrow toggle buttons + smoothing slider (for freehand edges).
 */
"use client";

import React, { useCallback } from "react";
import type Konva from "konva";
import type { CanvasEdgeState } from "@/shapes/shape-types";
import { useDiagramStore } from "@/stores/diagram-store";
import { addManualEdgeToOverlay, updateEdgeInOverlay } from "@/lib/overlay/diff";
import { smoothFreehandPoints } from "@/lib/canvas/smoothing";
import { historyManager } from "@/stores/history";

interface EdgeToolbarProps {
  edge: CanvasEdgeState;
  stageRef: React.RefObject<Konva.Stage | null>;
}

type ArrowConfig = "none" | "start" | "end" | "both";

function getArrowConfig(edge: CanvasEdgeState): ArrowConfig {
  const s = edge.arrowStart === "arrow";
  const e = edge.arrowEnd === "arrow";
  if (s && e) return "both";
  if (s) return "start";
  if (e) return "end";
  return "none";
}

export function EdgeToolbar({ edge, stageRef }: EdgeToolbarProps) {
  const updateOverlay = useDiagramStore((s) => s.updateOverlay);
  const upsertCanvasEdge = useDiagramStore((s) => s.upsertCanvasEdge);

  // Compute screen position: midpoint of edge
  const allPoints = [edge.start, ...edge.waypoints, edge.end];
  const midIdx = Math.floor(allPoints.length / 2);
  const mid = allPoints[midIdx];

  const stage = stageRef.current;
  const scale = stage?.scaleX() ?? 1;
  const stageX = stage?.x() ?? 0;
  const stageY = stage?.y() ?? 0;

  const screenX = mid.x * scale + stageX;
  const screenY = mid.y * scale + stageY - 50; // offset above

  const arrowConfig = getArrowConfig(edge);

  const setArrowConfig = useCallback(
    (config: ArrowConfig) => {
      const state = useDiagramStore.getState();
      historyManager.push({
        overlay: state.overlay,
        canvasNodes: state.canvasNodes,
        canvasEdges: state.canvasEdges,
      });

      const arrowStart = config === "start" || config === "both" ? "arrow" : "none";
      const arrowEnd = config === "end" || config === "both" ? "arrow" : "none";

      const updated: CanvasEdgeState = {
        ...edge,
        arrowStart: arrowStart as "none" | "arrow",
        arrowEnd: arrowEnd as "none" | "arrow",
      };

      upsertCanvasEdge(updated);

      if (edge.origin === "manual") {
        updateOverlay((prev) =>
          addManualEdgeToOverlay(prev, edge.edgeId, {
            waypoints: edge.waypoints,
            curveType: edge.curveType,
            rawPoints: edge.rawPoints,
            origin: "manual",
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            arrowStart: updated.arrowStart,
            arrowEnd: updated.arrowEnd,
            smoothing: edge.smoothing,
            color: edge.color,
          })
        );
      } else {
        updateOverlay((prev) =>
          updateEdgeInOverlay(prev, edge.edgeId, {
            waypoints: edge.waypoints,
            curveType: edge.curveType,
            arrowStart: updated.arrowStart,
            arrowEnd: updated.arrowEnd,
          })
        );
      }
    },
    [edge, upsertCanvasEdge, updateOverlay]
  );

  const handleSmoothingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const smoothing = Number(e.target.value) / 100;
      if (!edge.rawPoints) return;

      const state = useDiagramStore.getState();
      historyManager.push({
        overlay: state.overlay,
        canvasNodes: state.canvasNodes,
        canvasEdges: state.canvasEdges,
      });

      const smoothed = smoothFreehandPoints(edge.rawPoints, smoothing);

      const updated: CanvasEdgeState = {
        ...edge,
        smoothing,
        waypoints: smoothed,
      };

      upsertCanvasEdge(updated);

      updateOverlay((prev) =>
        addManualEdgeToOverlay(prev, edge.edgeId, {
          waypoints: smoothed,
          curveType: edge.curveType,
          rawPoints: edge.rawPoints,
          origin: "manual",
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          arrowStart: edge.arrowStart,
          arrowEnd: edge.arrowEnd,
          smoothing,
          color: edge.color,
        })
      );
    },
    [edge, upsertCanvasEdge, updateOverlay]
  );

  const arrowButtons: { config: ArrowConfig; label: string; icon: React.ReactNode }[] = [
    {
      config: "none",
      label: "No arrows",
      icon: (
        <svg width="16" height="12" viewBox="0 0 16 12">
          <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      config: "end",
      label: "Arrow at end",
      icon: (
        <svg width="16" height="12" viewBox="0 0 16 12">
          <line x1="2" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 3 L14 6 L10 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      config: "start",
      label: "Arrow at start",
      icon: (
        <svg width="16" height="12" viewBox="0 0 16 12">
          <line x1="4" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 3 L2 6 L6 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      config: "both",
      label: "Arrows on both ends",
      icon: (
        <svg width="16" height="12" viewBox="0 0 16 12">
          <line x1="4" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 3 L2 6 L6 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M10 3 L14 6 L10 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        transform: "translateX(-50%)",
        background: "white",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        padding: "6px 8px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        zIndex: 400,
        pointerEvents: "auto",
      }}
    >
      {/* Arrow direction buttons */}
      {arrowButtons.map((btn) => (
        <button
          key={btn.config}
          title={btn.label}
          onClick={() => setArrowConfig(btn.config)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            color: arrowConfig === btn.config ? "#2563eb" : "#6b7280",
            background: arrowConfig === btn.config ? "#eff6ff" : "transparent",
            transition: "all 0.1s",
          }}
        >
          {btn.icon}
        </button>
      ))}

      {/* Smoothing slider (freehand only) */}
      {edge.origin === "manual" && edge.rawPoints && (
        <>
          <div
            style={{
              width: 1,
              height: 20,
              background: "#e5e7eb",
              margin: "0 4px",
            }}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "#6b7280",
              whiteSpace: "nowrap",
            }}
          >
            Smooth
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((edge.smoothing ?? 0.5) * 100)}
              onChange={handleSmoothingChange}
              style={{ width: 60, accentColor: "#2563eb" }}
            />
          </label>
        </>
      )}
    </div>
  );
}
