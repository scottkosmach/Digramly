import React from "react";
import type { CanvasNodeState, NodeShapeType } from "../shape-types";
import { BoxShape } from "./BoxShape";
import { DiamondShape } from "./DiamondShape";
import { CylinderShape } from "./CylinderShape";
import { CircleShape } from "./CircleShape";
import { RoundedRectShape } from "./RoundedRectShape";
import { StadiumShape } from "./StadiumShape";

interface ShapeRendererProps {
  node: CanvasNodeState;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDblClick: (id: string) => void;
}

const SHAPE_COMPONENTS: Record<NodeShapeType, React.ComponentType<{
  node: CanvasNodeState;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDblClick: (id: string) => void;
}>> = {
  box: BoxShape,
  diamond: DiamondShape,
  cylinder: CylinderShape,
  circle: CircleShape,
  "rounded-rect": RoundedRectShape,
  stadium: StadiumShape,
};

export function ShapeRenderer({ node, isSelected, onSelect, onDragEnd, onDblClick }: ShapeRendererProps) {
  const Component = SHAPE_COMPONENTS[node.shapeType] ?? BoxShape;
  return (
    <Component
      node={node}
      isSelected={isSelected}
      onSelect={onSelect}
      onDragEnd={onDragEnd}
      onDblClick={onDblClick}
    />
  );
}
