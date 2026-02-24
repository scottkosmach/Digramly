/**
 * In-progress freehand stroke preview.
 * Shows a dashed line while the user is drawing.
 */
import React from "react";
import { Line } from "react-konva";

interface FreehandPreviewProps {
  points: { x: number; y: number }[];
}

export function FreehandPreview({ points }: FreehandPreviewProps) {
  if (points.length < 2) return null;

  // Flatten points to [x1, y1, x2, y2, ...]
  const flatPoints = points.flatMap((p) => [p.x, p.y]);

  return (
    <Line
      points={flatPoints}
      stroke="#2563eb"
      strokeWidth={2}
      dash={[6, 4]}
      lineCap="round"
      lineJoin="round"
      listening={false}
      opacity={0.7}
    />
  );
}
