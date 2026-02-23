// Ensure type augmentation is loaded
import "@/shapes/diagram-shapes";
import { BoxShapeUtil } from "@/shapes/BoxShapeUtil";
import { DiamondShapeUtil } from "@/shapes/DiamondShapeUtil";
import { CylinderShapeUtil } from "@/shapes/CylinderShapeUtil";
import { CircleShapeUtil } from "@/shapes/CircleShapeUtil";
import { RoundedRectShapeUtil } from "@/shapes/RoundedRectShapeUtil";
import { StadiumShapeUtil } from "@/shapes/StadiumShapeUtil";
import { ConnectorShapeUtil } from "@/connectors/ConnectorShapeUtil";
import { DiagramShapeTool } from "@/tools/DiagramShapeTool";

/** All custom shape utils to register with tldraw */
export const customShapeUtils = [
  BoxShapeUtil,
  DiamondShapeUtil,
  CylinderShapeUtil,
  CircleShapeUtil,
  RoundedRectShapeUtil,
  StadiumShapeUtil,
  ConnectorShapeUtil,
];

/** All custom tools to register with tldraw */
export const customTools = [DiagramShapeTool];
