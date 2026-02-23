/**
 * Mermaid parser wrapper.
 * Extracts vertices, edges, subgraphs from mermaid's internal FlowDB.
 */
import type {
  MermaidGraph,
  MermaidNode,
  MermaidEdge,
  MermaidSubGraph,
  MermaidNodeShape,
} from "./types";

let initialized = false;

/** Lazy-initialize mermaid (must happen before parsing) */
async function ensureInitialized() {
  if (initialized) return;
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false });
  initialized = true;
}

/** Map mermaid's raw vertex type to our shape types */
function mapVertexType(
  type: string | undefined
): MermaidNodeShape {
  switch (type) {
    case undefined:
    case "square":
      return "box";
    case "round":
      return "round";
    case "stadium":
      return "stadium";
    case "diamond":
      return "diamond";
    case "cylinder":
      return "cylinder";
    case "circle":
    case "doublecircle":
      return "circle";
    // Less common shapes → fallback to box
    case "hexagon":
    case "subroutine":
    case "odd":
    case "trapezoid":
    case "inv_trapezoid":
    case "lean_right":
    case "lean_left":
    case "rect":
    case "ellipse":
    default:
      return "box";
  }
}

/** Strip HTML tags from label text */
function cleanLabel(text: string | undefined): string {
  if (!text) return "";
  return text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").trim();
}

/**
 * Parse mermaid code into a structured graph.
 * Returns null if parsing fails.
 */
export async function parseMermaid(
  code: string
): Promise<MermaidGraph | null> {
  try {
    await ensureInitialized();
    const mermaid = (await import("mermaid")).default;

    const diagram = await mermaid.mermaidAPI.getDiagramFromText(code);
    const db = diagram.db as any;

    // Extract direction
    const rawDirection = db.getDirection?.() ?? "TD";
    const direction = (["TD", "TB", "LR", "RL", "BT"].includes(rawDirection)
      ? rawDirection
      : "TD") as MermaidGraph["direction"];

    // Extract vertices
    const vertexMap: Map<string, any> = db.getVertices();
    const nodes: MermaidNode[] = [];
    vertexMap.forEach((vertex: any, id: string) => {
      nodes.push({
        id,
        label: cleanLabel(vertex.text) || id,
        shape: mapVertexType(vertex.type),
      });
    });

    // Extract edges
    const rawEdges: any[] = db.getEdges();
    const edgeCounts = new Map<string, number>();
    const edges: MermaidEdge[] = rawEdges.map((edge: any) => {
      const baseKey = `${edge.start}->${edge.end}`;
      const count = edgeCounts.get(baseKey) ?? 0;
      edgeCounts.set(baseKey, count + 1);
      // Use counter suffix for duplicate edges between same nodes
      const edgeId = count > 0 ? `${baseKey}#${count}` : baseKey;
      return {
        id: edgeId,
        sourceId: edge.start,
        targetId: edge.end,
        label: cleanLabel(edge.text) || "",
      };
    });

    // Extract subgraphs
    const rawSubGraphs: any[] = db.getSubGraphs?.() ?? [];
    const subgraphs: MermaidSubGraph[] = rawSubGraphs.map((sg: any) => ({
      id: sg.id,
      label: sg.title || sg.id,
      nodeIds: sg.nodes ?? [],
    }));

    return { direction, nodes, edges, subgraphs };
  } catch {
    return null;
  }
}

/**
 * Validate mermaid code without extracting structure.
 * Returns error message or null if valid.
 */
export async function validateMermaid(
  code: string
): Promise<string | null> {
  try {
    await ensureInitialized();
    const mermaid = (await import("mermaid")).default;
    await mermaid.parse(code);
    return null;
  } catch (e: any) {
    return e?.message ?? "Invalid Mermaid syntax";
  }
}
