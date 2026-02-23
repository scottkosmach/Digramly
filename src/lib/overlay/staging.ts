/**
 * Staging area logic for unpositioned nodes.
 * When mermaid code adds new nodes that have no overlay position,
 * they go to a staging area until the user places them.
 */
import type { MermaidNode } from "@/lib/mermaid/types";
import { SHAPE_DEFAULTS } from "@/shapes/shared/shape-styles";

export interface StagedNode extends MermaidNode {
  /** When the node was staged (for ordering) */
  stagedAt: number;
}

/**
 * Calculate positions for placing all staged nodes on the canvas.
 * Arranges them in a grid starting from the given origin.
 */
export function calculatePlacementPositions(
  count: number,
  origin: { x: number; y: number },
  columns: number = 3
): { x: number; y: number }[] {
  const gapX = SHAPE_DEFAULTS.w + 30;
  const gapY = SHAPE_DEFAULTS.h + 30;
  const positions: { x: number; y: number }[] = [];

  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    positions.push({
      x: origin.x + col * gapX,
      y: origin.y + row * gapY,
    });
  }

  return positions;
}
