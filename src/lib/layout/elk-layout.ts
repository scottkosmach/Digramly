/**
 * ELK.js layout service.
 * Converts a parsed MermaidGraph into positioned nodes + edge bend points.
 */
import ELK from "elkjs/lib/elk.bundled.js";
import type { MermaidGraph } from "@/lib/mermaid/types";
import type { LayoutResult, LayoutNode, LayoutEdge } from "./types";
import { SHAPE_DEFAULTS } from "@/shapes/shared/shape-styles";

const elk = new ELK();

/** Map mermaid direction to ELK layout direction */
function elkDirection(dir: MermaidGraph["direction"]): string {
  switch (dir) {
    case "TD":
    case "TB":
      return "DOWN";
    case "BT":
      return "UP";
    case "LR":
      return "RIGHT";
    case "RL":
      return "LEFT";
    default:
      return "DOWN";
  }
}

/**
 * Run ELK layout on a parsed mermaid graph.
 * Returns positioned nodes and edge bend points.
 */
export async function layoutGraph(
  graph: MermaidGraph
): Promise<LayoutResult> {
  const nodeW = SHAPE_DEFAULTS.w;
  const nodeH = SHAPE_DEFAULTS.h;

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": elkDirection(graph.direction),
      "elk.spacing.nodeNode": "50",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    },
    children: graph.nodes.map((node) => ({
      id: node.id,
      width: nodeW,
      height: nodeH,
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.sourceId],
      targets: [edge.targetId],
    })),
  };

  const result = await elk.layout(elkGraph);

  const nodes: LayoutNode[] = (result.children ?? []).map((child) => ({
    id: child.id,
    x: child.x ?? 0,
    y: child.y ?? 0,
    width: child.width ?? nodeW,
    height: child.height ?? nodeH,
  }));

  const edges: LayoutEdge[] = (result.edges ?? []).map((edge: any) => {
    const sections = edge.sections ?? [];
    const bendPoints: { x: number; y: number }[] = [];
    for (const section of sections) {
      if (section.startPoint) {
        bendPoints.push({ x: section.startPoint.x, y: section.startPoint.y });
      }
      if (section.bendPoints) {
        for (const bp of section.bendPoints) {
          bendPoints.push({ x: bp.x, y: bp.y });
        }
      }
      if (section.endPoint) {
        bendPoints.push({ x: section.endPoint.x, y: section.endPoint.y });
      }
    }

    return {
      id: edge.id,
      sourceId: edge.sources[0],
      targetId: edge.targets[0],
      bendPoints,
    };
  });

  return {
    nodes,
    edges,
    width: (result as any).width ?? 800,
    height: (result as any).height ?? 600,
  };
}
