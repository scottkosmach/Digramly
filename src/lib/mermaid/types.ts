/** Types for parsed Mermaid diagram structures */

export interface MermaidNode {
  id: string;
  label: string;
  shape: MermaidNodeShape;
}

/** Maps Mermaid bracket syntax to our shape types */
export type MermaidNodeShape =
  | "box"        // [text]    → diagram-box
  | "round"      // (text)    → diagram-rounded-rect
  | "stadium"    // ([text])  → diagram-stadium
  | "diamond"    // {text}    → diagram-diamond
  | "cylinder"   // [(text)]  → diagram-cylinder
  | "circle";    // ((text))  → diagram-circle

export interface MermaidEdge {
  id: string;           // "sourceId->targetId" composite key
  sourceId: string;
  targetId: string;
  label: string;
}

export interface MermaidSubGraph {
  id: string;
  label: string;
  nodeIds: string[];
}

export interface MermaidGraph {
  direction: "TD" | "TB" | "LR" | "RL" | "BT";
  nodes: MermaidNode[];
  edges: MermaidEdge[];
  subgraphs: MermaidSubGraph[];
}

/** Map from Mermaid shape syntax to our Konva shape type names */
export const MERMAID_SHAPE_TO_TYPE: Record<MermaidNodeShape, string> = {
  box: "box",
  round: "rounded-rect",
  stadium: "stadium",
  diamond: "diamond",
  cylinder: "cylinder",
  circle: "circle",
};
