/** Canvas node/edge state types for Zustand store */

import type { ShapeColor } from "./shared/shape-styles";
import type { CurveType } from "@/connectors/connector-rendering";

export type NodeShapeType =
  | "box"
  | "diamond"
  | "cylinder"
  | "circle"
  | "rounded-rect"
  | "stadium";

export interface CanvasNodeState {
  id: string;
  nodeId: string;         // Mermaid node ID
  shapeType: NodeShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: ShapeColor;
}

export interface CanvasEdgeState {
  id: string;
  edgeId: string;         // Mermaid edge ID ("sourceId->targetId")
  sourceId: string;
  targetId: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  waypoints: { x: number; y: number }[];
  curveType: CurveType;
  label: string;
  color: string;
}
