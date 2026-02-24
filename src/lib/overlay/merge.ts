/**
 * Merge logic: parsedMermaid + overlay → canvas operations.
 *
 * Rules:
 * - Node in overlay → use stored position
 * - Node NOT in overlay → goes to staging area
 * - Edge in overlay → use stored waypoints
 * - Edge NOT in overlay → auto-route (use layout bend points)
 */
import type { MermaidGraph, MermaidNode } from "@/lib/mermaid/types";
import { MERMAID_SHAPE_TO_TYPE } from "@/lib/mermaid/types";
import type { LayoutResult } from "@/lib/layout/types";
import type { DiagramOverlay } from "./types";
import { SHAPE_DEFAULTS } from "@/shapes/shared/shape-styles";
import type { NodeShapeType } from "@/shapes/shape-types";

export interface CanvasNode {
  nodeId: string;
  label: string;
  shapeType: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface CanvasEdge {
  edgeId: string;
  sourceId: string;
  targetId: string;
  label: string;
  waypoints: { x: number; y: number }[];
  curveType: "straight" | "bezier" | "orthogonal";
}

export interface MergeResult {
  /** Nodes with positions (either from overlay or layout) — ready to render */
  positionedNodes: CanvasNode[];
  /** Nodes that have no overlay position and need user placement */
  stagedNodes: MermaidNode[];
  /** Edges ready to render */
  edges: CanvasEdge[];
  /** Node IDs that existed in overlay but are gone from mermaid (to remove) */
  removedNodeIds: string[];
  /** Edge IDs that existed in overlay but are gone from mermaid (to remove) */
  removedEdgeIds: string[];
}

/**
 * Merge parsed Mermaid graph + overlay + layout → canvas state.
 */
export function mergeGraphWithOverlay(
  graph: MermaidGraph,
  overlay: DiagramOverlay,
  layout: LayoutResult
): MergeResult {
  const positionedNodes: CanvasNode[] = [];
  const stagedNodes: MermaidNode[] = [];

  // Build lookup from layout
  const layoutNodeMap = new Map(layout.nodes.map((n) => [n.id, n]));
  const layoutEdgeMap = new Map(layout.edges.map((e) => [e.id, e]));

  // Process nodes
  for (const node of graph.nodes) {
    const nodeOverlay = overlay.nodes[node.id];
    const layoutNode = layoutNodeMap.get(node.id);

    if (nodeOverlay) {
      // Has overlay position → render at stored position
      positionedNodes.push({
        nodeId: node.id,
        label: node.label,
        shapeType: MERMAID_SHAPE_TO_TYPE[node.shape],
        x: nodeOverlay.x,
        y: nodeOverlay.y,
        w: nodeOverlay.w,
        h: nodeOverlay.h,
        color: nodeOverlay.color ?? "blue",
      });
    } else if (layoutNode) {
      // No overlay but has layout → auto-place and add to positioned
      positionedNodes.push({
        nodeId: node.id,
        label: node.label,
        shapeType: MERMAID_SHAPE_TO_TYPE[node.shape],
        x: layoutNode.x,
        y: layoutNode.y,
        w: layoutNode.width,
        h: layoutNode.height,
        color: "blue",
      });
    } else {
      // No overlay, no layout → staging
      stagedNodes.push(node);
    }
  }

  // Process edges
  const currentNodeIds = new Set(graph.nodes.map((n) => n.id));
  const edges: CanvasEdge[] = [];

  for (const edge of graph.edges) {
    // Skip edges where source or target no longer exists
    if (!currentNodeIds.has(edge.sourceId) || !currentNodeIds.has(edge.targetId)) {
      continue;
    }

    const edgeOverlay = overlay.edges[edge.id];
    const layoutEdge = layoutEdgeMap.get(edge.id);

    if (edgeOverlay) {
      edges.push({
        edgeId: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        label: edge.label,
        waypoints: edgeOverlay.waypoints,
        curveType: edgeOverlay.curveType,
      });
    } else if (layoutEdge && layoutEdge.bendPoints.length >= 2) {
      edges.push({
        edgeId: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        label: edge.label,
        waypoints: layoutEdge.bendPoints.slice(1, -1), // exclude start/end
        curveType: "orthogonal",
      });
    } else {
      // Fallback: no waypoints, straight line
      edges.push({
        edgeId: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        label: edge.label,
        waypoints: [],
        curveType: "bezier",
      });
    }
  }

  // Find removed nodes/edges (in overlay but not in current graph)
  const currentMermaidNodeIds = new Set(graph.nodes.map((n) => n.id));
  const currentMermaidEdgeIds = new Set(graph.edges.map((e) => e.id));

  const removedNodeIds = Object.keys(overlay.nodes).filter(
    (id) => !currentMermaidNodeIds.has(id)
  );
  const removedEdgeIds = Object.keys(overlay.edges).filter(
    (id) => !currentMermaidEdgeIds.has(id)
  );

  return { positionedNodes, stagedNodes, edges, removedNodeIds, removedEdgeIds };
}
