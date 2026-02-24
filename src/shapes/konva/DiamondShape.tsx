import React from "react";
import { Group, Line, Text } from "react-konva";
import type { CanvasNodeState } from "../shape-types";
import { SHAPE_COLORS, FONT, SHAPE_DEFAULTS } from "../shared/shape-styles";

interface DiamondShapeProps {
  node: CanvasNodeState;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDblClick: (id: string) => void;
}

export function DiamondShape({ node, isSelected, onSelect, onDragEnd, onDblClick }: DiamondShapeProps) {
  const colors = SHAPE_COLORS[node.color] ?? SHAPE_COLORS.blue;
  const { w, h } = node;

  // 4-point diamond polygon (relative to group origin)
  const points = [
    w / 2, 0,    // top
    w, h / 2,    // right
    w / 2, h,    // bottom
    0, h / 2,    // left
  ];

  return (
    <Group
      id={node.id}
      x={node.x}
      y={node.y}
      draggable
      onClick={() => onSelect(node.id)}
      onTap={() => onSelect(node.id)}
      onDblClick={() => onDblClick(node.id)}
      onDblTap={() => onDblClick(node.id)}
      onDragEnd={(e) => {
        onDragEnd(node.id, e.target.x(), e.target.y());
      }}
    >
      <Line
        points={points}
        closed
        fill={colors.fill}
        stroke={isSelected ? "#2563eb" : colors.stroke}
        strokeWidth={isSelected ? 2.5 : SHAPE_DEFAULTS.strokeWidth}
      />
      <Text
        text={node.label}
        width={w}
        height={h}
        align="center"
        verticalAlign="middle"
        fontSize={FONT.size}
        fontFamily={FONT.family}
        fill={colors.text}
        padding={SHAPE_DEFAULTS.padding}
        listening={false}
      />
    </Group>
  );
}
