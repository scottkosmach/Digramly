import React from "react";
import { Group, Rect, Text } from "react-konva";
import type { CanvasNodeState } from "../shape-types";
import { SHAPE_COLORS, FONT, SHAPE_DEFAULTS } from "../shared/shape-styles";

interface BoxShapeProps {
  node: CanvasNodeState;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDblClick: (id: string) => void;
  listening?: boolean;
}

export function BoxShape({ node, isSelected, onSelect, onDragEnd, onDblClick, listening }: BoxShapeProps) {
  const colors = SHAPE_COLORS[node.color] ?? SHAPE_COLORS.blue;

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
      <Rect
        width={node.w}
        height={node.h}
        fill={colors.fill}
        stroke={isSelected ? "#2563eb" : colors.stroke}
        strokeWidth={isSelected ? 2.5 : SHAPE_DEFAULTS.strokeWidth}
        cornerRadius={4}
      />
      <Text
        text={node.label}
        width={node.w}
        height={node.h}
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
