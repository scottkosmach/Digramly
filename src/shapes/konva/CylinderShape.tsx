import React from "react";
import { Group, Path, Ellipse, Text, Rect } from "react-konva";
import type { CanvasNodeState } from "../shape-types";
import { SHAPE_COLORS, FONT, SHAPE_DEFAULTS } from "../shared/shape-styles";

interface CylinderShapeProps {
  node: CanvasNodeState;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDblClick: (id: string) => void;
}

export function CylinderShape({ node, isSelected, onSelect, onDragEnd, onDblClick }: CylinderShapeProps) {
  const colors = SHAPE_COLORS[node.color] ?? SHAPE_COLORS.blue;
  const { w, h } = node;
  const ry = Math.min(h * 0.15, 14); // ellipse vertical radius
  const rx = w / 2;
  const bodyTop = ry;
  const bodyBottom = h - ry;
  const stroke = isSelected ? "#2563eb" : colors.stroke;
  const sw = isSelected ? 2.5 : SHAPE_DEFAULTS.strokeWidth;

  // Body: two vertical lines + fill rect
  const bodyPath = `M 0 ${bodyTop} L 0 ${bodyBottom} A ${rx} ${ry} 0 0 0 ${w} ${bodyBottom} L ${w} ${bodyTop}`;

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
      {/* Transparent hit area so Group receives pointer events */}
      <Rect width={w} height={h} fill="transparent" />
      {/* Body fill */}
      <Path data={bodyPath} fill={colors.fill} listening={false} />
      {/* Bottom ellipse */}
      <Ellipse
        x={rx}
        y={bodyBottom}
        radiusX={rx}
        radiusY={ry}
        fill={colors.fill}
        stroke={stroke}
        strokeWidth={sw}
        listening={false}
      />
      {/* Body sides */}
      <Path data={bodyPath} stroke={stroke} strokeWidth={sw} listening={false} />
      {/* Top ellipse (drawn last so it overlaps body) */}
      <Ellipse
        x={rx}
        y={bodyTop}
        radiusX={rx}
        radiusY={ry}
        fill={colors.fill}
        stroke={stroke}
        strokeWidth={sw}
        listening={false}
      />
      <Text
        text={node.label}
        width={w}
        y={ry}
        height={h - ry * 2}
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
