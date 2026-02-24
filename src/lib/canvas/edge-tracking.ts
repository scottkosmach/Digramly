/** Recalculate edge endpoints based on current node positions */

import type { CanvasNodeState, CanvasEdgeState } from "@/shapes/shape-types";

/**
 * Given source/target node positions, compute connector start/end points.
 * For TD (top-down) graphs: bottom-center of source → top-center of target.
 * Falls back to closest-side heuristic otherwise.
 */
export function computeEdgeEndpoints(
  edge: CanvasEdgeState,
  nodes: Map<string, CanvasNodeState>
): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
  // Find source/target by nodeId
  let source: CanvasNodeState | undefined;
  let target: CanvasNodeState | undefined;

  for (const n of nodes.values()) {
    if (n.nodeId === edge.sourceId) source = n;
    if (n.nodeId === edge.targetId) target = n;
  }

  if (!source || !target) return null;

  // Determine direction based on relative positions
  const srcCx = source.x + source.w / 2;
  const srcCy = source.y + source.h / 2;
  const tgtCx = target.x + target.w / 2;
  const tgtCy = target.y + target.h / 2;

  const dx = tgtCx - srcCx;
  const dy = tgtCy - srcCy;

  let start: { x: number; y: number };
  let end: { x: number; y: number };

  if (Math.abs(dy) >= Math.abs(dx)) {
    // Predominantly vertical
    if (dy >= 0) {
      // Target is below source
      start = { x: srcCx, y: source.y + source.h };
      end = { x: tgtCx, y: target.y };
    } else {
      // Target is above source
      start = { x: srcCx, y: source.y };
      end = { x: tgtCx, y: target.y + target.h };
    }
  } else {
    // Predominantly horizontal
    if (dx >= 0) {
      // Target is right of source
      start = { x: source.x + source.w, y: srcCy };
      end = { x: target.x, y: tgtCy };
    } else {
      // Target is left of source
      start = { x: source.x, y: srcCy };
      end = { x: target.x + target.w, y: tgtCy };
    }
  }

  return { start, end };
}
