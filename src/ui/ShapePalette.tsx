"use client";

import React, { useState } from "react";
import { useDiagramStore } from "@/stores/diagram-store";
import type { NodeShapeType } from "@/shapes/shape-types";
import { SHAPE_DEFAULTS } from "@/shapes/shared/shape-styles";

interface ShapeOption {
  type: NodeShapeType;
  label: string;
  icon: React.ReactElement;
}

const SHAPE_OPTIONS: ShapeOption[] = [
  {
    type: "box",
    label: "Box",
    icon: (
      <svg width="20" height="16" viewBox="0 0 20 16">
        <rect x="1" y="1" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    type: "rounded-rect",
    label: "Rounded",
    icon: (
      <svg width="20" height="16" viewBox="0 0 20 16">
        <rect x="1" y="1" width="18" height="14" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    type: "diamond",
    label: "Diamond",
    icon: (
      <svg width="20" height="18" viewBox="0 0 20 18">
        <path d="M 10 1 L 19 9 L 10 17 L 1 9 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    type: "cylinder",
    label: "Cylinder",
    icon: (
      <svg width="18" height="20" viewBox="0 0 18 20">
        <ellipse cx="9" cy="4" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 2 4 L 2 16" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 16 4 L 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="9" cy="16" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    type: "circle",
    label: "Circle",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    type: "stadium",
    label: "Stadium",
    icon: (
      <svg width="22" height="14" viewBox="0 0 22 14">
        <rect x="1" y="1" width="20" height="12" rx="6" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
];

export function ShapePalette() {
  const upsertCanvasNode = useDiagramStore((s) => s.upsertCanvasNode);
  const selectNode = useDiagramStore((s) => s.selectNode);
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const handleAddShape = (type: NodeShapeType) => {
    const id = crypto.randomUUID();
    const w = SHAPE_DEFAULTS.w;
    const h = SHAPE_DEFAULTS.h;

    // Place near center-ish (200, 200) with some randomness to avoid overlap
    const x = 150 + Math.random() * 100;
    const y = 150 + Math.random() * 100;

    upsertCanvasNode({
      id,
      nodeId: `manual-${id.slice(0, 8)}`,
      shapeType: type,
      x,
      y,
      w,
      h,
      label: type.charAt(0).toUpperCase() + type.slice(1).replace("-", " "),
      color: "blue",
    });
    selectNode(id);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        background: "white",
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)",
        padding: 4,
        zIndex: 300,
      }}
    >
      {SHAPE_OPTIONS.map((opt) => (
        <button
          key={opt.type}
          title={opt.label}
          onClick={() => handleAddShape(opt.type)}
          onMouseEnter={() => setHoveredType(opt.type)}
          onMouseLeave={() => setHoveredType(null)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            color: hoveredType === opt.type ? "#2563eb" : "#374151",
            background: hoveredType === opt.type ? "#eff6ff" : "transparent",
            transition: "all 0.15s",
          }}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
