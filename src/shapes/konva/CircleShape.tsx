import React from "react";
import { Group, Ellipse, Text } from "react-konva";
import type { CanvasNodeState } from "../shape-types";
import { SHAPE_COLORS, FONT, SHAPE_DEFAULTS } from "../shared/shape-styles";

interface CircleShapeProps {
  node: CanvasNodeState;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDblClick: (id: string) => void;
  listening?: boolean;
}

export function CircleShape({ node, isSelected, onSelect, onDragEnd, onDblClick, listening }: CircleShapeProps) {
  const colors = SHAPE_COLORS[node.color] ?? SHAPE_COLORS.blue;
  const { w, h } = node;

  return (
    <Group
      id={node.id}
      x={node.x}
      y={node.y}
      listening={listening !== false}
      draggable={listening !== false}
      onClick={() => onSelect(node.id)}
      onTap={() => onSelect(node.id)}
      onDblClick={() => onDblClick(node.id)}
      onDblTap={() => onDblClick(node.id)}
      onDragEnd={(e) => {
        onDragEnd(node.id, e.target.x(), e.target.y());
      }}
    >
      <Ellipse
        x={w / 2}
        y={h / 2}
        radiusX={w / 2}
        radiusY={h / 2}
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
