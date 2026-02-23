"use client";

import React, { useState } from "react";
import { useDiagramStore } from "@/stores/diagram-store";
import { MERMAID_SHAPE_TO_TYPE } from "@/lib/mermaid/types";

interface StagingAreaProps {
  onPlaceNode: (nodeId: string, x: number, y: number) => void;
  onPlaceAll: () => void;
}

export function StagingArea({ onPlaceNode, onPlaceAll }: StagingAreaProps) {
  const stagedNodes = useDiagramStore((s) => s.stagedNodes);
  const [collapsed, setCollapsed] = useState(false);

  if (stagedNodes.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(8px)",
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        border: "1px solid rgba(0,0,0,0.08)",
        maxWidth: 280,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "none",
          border: "none",
          cursor: "pointer",
          borderBottom: collapsed ? "none" : "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          New Nodes ({stagedNodes.length})
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
          style={{
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!collapsed && (
        <div style={{ padding: "6px 10px 10px" }}>
          {/* Node list */}
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {stagedNodes.map((node) => (
              <div
                key={node.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 4px",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#4b5563",
                }}
              >
                <ShapeIcon shape={node.shape} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {node.label}
                </span>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{node.id}</span>
              </div>
            ))}
          </div>

          {/* Place All button */}
          <button
            onClick={onPlaceAll}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "7px 12px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Place All on Canvas
          </button>
        </div>
      )}
    </div>
  );
}

/** Tiny shape icon based on mermaid shape type */
function ShapeIcon({ shape }: { shape: string }) {
  const size = 16;
  const color = "#6b7280";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5">
      {shape === "diamond" ? (
        <polygon points="8,1 15,8 8,15 1,8" />
      ) : shape === "circle" ? (
        <circle cx="8" cy="8" r="6" />
      ) : shape === "cylinder" ? (
        <>
          <ellipse cx="8" cy="4" rx="6" ry="2.5" />
          <line x1="2" y1="4" x2="2" y2="12" />
          <line x1="14" y1="4" x2="14" y2="12" />
          <ellipse cx="8" cy="12" rx="6" ry="2.5" />
        </>
      ) : shape === "stadium" ? (
        <rect x="1" y="3" width="14" height="10" rx="5" />
      ) : shape === "round" ? (
        <rect x="1" y="2" width="14" height="12" rx="3" />
      ) : (
        <rect x="1" y="2" width="14" height="12" rx="1" />
      )}
    </svg>
  );
}
