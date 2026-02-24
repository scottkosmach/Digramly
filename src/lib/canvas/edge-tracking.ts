/** Recalculate edge endpoints based on current node positions */

import type { CanvasNodeState, CanvasEdgeState } from "@/shapes/shape-types";
import { computePerimeterAnchor } from "./perimeter-anchor";

/**
 * Given source/target node positions, compute connector start/end points
 * using shape-aware perimeter anchoring.
 * Returns null if source or target node is missing (unattached endpoint).
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

  // For unattached endpoints, return raw positions
  if (!source && !target) return null;

  const srcCx = source ? source.x + source.w / 2 : edge.start.x;
  const srcCy = source ? source.y + source.h / 2 : edge.start.y;
  const tgtCx = target ? target.x + target.w / 2 : edge.end.x;
  const tgtCy = target ? target.y + target.h / 2 : edge.end.y;

  const start = source
    ? computePerimeterAnchor(source, { x: tgtCx, y: tgtCy })
    : { x: edge.start.x, y: edge.start.y };

  const end = target
    ? computePerimeterAnchor(target, { x: srcCx, y: srcCy })
    : { x: edge.end.x, y: edge.end.y };

  return { start, end };
}
