import { TLBaseShape } from "tldraw";
import type { ShapeColor } from "./shared/shape-styles";
import type { CurveType } from "@/connectors/connector-rendering";

/** All diagram node shape types share these base props */
export interface DiagramNodeProps {
  w: number;
  h: number;
  label: string;
  color: ShapeColor;
  nodeId: string; // Links to Mermaid node ID
}

/** Connector shape props */
export interface DiagramConnectorProps {
  start: { x: number; y: number };
  end: { x: number; y: number };
  waypoints: { x: number; y: number }[];
  curveType: CurveType;
  label: string;
  edgeId: string;
  color: string;
}

// Register custom shapes with tldraw's type system via module augmentation
declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    "diagram-box": DiagramNodeProps;
    "diagram-diamond": DiagramNodeProps;
    "diagram-cylinder": DiagramNodeProps;
    "diagram-circle": DiagramNodeProps;
    "diagram-rounded-rect": DiagramNodeProps;
    "diagram-stadium": DiagramNodeProps;
    "diagram-connector": DiagramConnectorProps;
  }
}

// Shape type definitions
export type DiagramBoxShape = TLBaseShape<"diagram-box", DiagramNodeProps>;
export type DiagramDiamondShape = TLBaseShape<"diagram-diamond", DiagramNodeProps>;
export type DiagramCylinderShape = TLBaseShape<"diagram-cylinder", DiagramNodeProps>;
export type DiagramCircleShape = TLBaseShape<"diagram-circle", DiagramNodeProps>;
export type DiagramRoundedRectShape = TLBaseShape<"diagram-rounded-rect", DiagramNodeProps>;
export type DiagramStadiumShape = TLBaseShape<"diagram-stadium", DiagramNodeProps>;
export type ConnectorShape = TLBaseShape<"diagram-connector", DiagramConnectorProps>;

export type DiagramNodeShape =
  | DiagramBoxShape
  | DiagramDiamondShape
  | DiagramCylinderShape
  | DiagramCircleShape
  | DiagramRoundedRectShape
  | DiagramStadiumShape;

export type DiagramNodeType = DiagramNodeShape["type"];

export const DIAGRAM_NODE_TYPES: DiagramNodeType[] = [
  "diagram-box",
  "diagram-diamond",
  "diagram-cylinder",
  "diagram-circle",
  "diagram-rounded-rect",
  "diagram-stadium",
];
