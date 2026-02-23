/** Types for the diagram overlay (user positioning/styling layer) */

export interface NodeOverlay {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  tldrawShapeId?: string;
}

export interface EdgeOverlay {
  waypoints: { x: number; y: number }[];
  curveType: "straight" | "bezier" | "orthogonal";
  tldrawShapeId?: string;
}

export interface DiagramOverlay {
  version: 1;
  nodes: Record<string, NodeOverlay>;    // keyed by Mermaid node ID
  edges: Record<string, EdgeOverlay>;    // keyed by "sourceId->targetId"
}

export function createEmptyOverlay(): DiagramOverlay {
  return { version: 1, nodes: {}, edges: {} };
}
