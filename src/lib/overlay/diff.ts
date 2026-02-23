/**
 * Diff logic: canvas changes → overlay updates.
 * Listens to tldraw shape changes and updates the overlay accordingly.
 * Does NOT modify Mermaid code — only updates positions/styles.
 */
import type { DiagramOverlay, NodeOverlay, EdgeOverlay } from "./types";

/**
 * Update overlay when a node shape moves/resizes on canvas.
 */
export function updateNodeInOverlay(
  overlay: DiagramOverlay,
  nodeId: string,
  update: Partial<NodeOverlay>
): DiagramOverlay {
  const existing = overlay.nodes[nodeId] ?? {
    x: 0,
    y: 0,
    w: 160,
    h: 70,
  };

  return {
    ...overlay,
    nodes: {
      ...overlay.nodes,
      [nodeId]: { ...existing, ...update },
    },
  };
}

/**
 * Update overlay when an edge's waypoints change on canvas.
 */
export function updateEdgeInOverlay(
  overlay: DiagramOverlay,
  edgeId: string,
  update: Partial<EdgeOverlay>
): DiagramOverlay {
  const existing = overlay.edges[edgeId] ?? {
    waypoints: [],
    curveType: "bezier" as const,
  };

  return {
    ...overlay,
    edges: {
      ...overlay.edges,
      [edgeId]: { ...existing, ...update },
    },
  };
}

/**
 * Remove nodes/edges from overlay that no longer exist in mermaid.
 */
export function cleanupOverlay(
  overlay: DiagramOverlay,
  removedNodeIds: string[],
  removedEdgeIds: string[]
): DiagramOverlay {
  const nodes = { ...overlay.nodes };
  const edges = { ...overlay.edges };

  for (const id of removedNodeIds) {
    delete nodes[id];
  }
  for (const id of removedEdgeIds) {
    delete edges[id];
  }

  return { ...overlay, nodes, edges };
}
