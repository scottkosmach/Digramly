import React from "react";
import { Group, Path, Circle, Rect, Text } from "react-konva";
import type { CanvasEdgeState } from "../shape-types";
import { buildPath, buildArrowhead, getArrowDirection } from "@/connectors/connector-rendering";
import { FONT } from "../shared/shape-styles";

interface ConnectorShapeProps {
  edge: CanvasEdgeState;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onWaypointDrag: (edgeId: string, wpIndex: number, x: number, y: number) => void;
}

export function ConnectorShape({ edge, isSelected, onSelect, onWaypointDrag }: ConnectorShapeProps) {
  const allPoints = [edge.start, ...edge.waypoints, edge.end];
  const pathD = buildPath(allPoints, edge.curveType);

  const { from: arrowFrom, to: arrowTo } = getArrowDirection(allPoints, edge.curveType);
  const arrowD = buildArrowhead(arrowFrom, arrowTo, 10);

  // Label at midpoint
  const midIdx = Math.floor(allPoints.length / 2);
  const mid = allPoints[midIdx];

  return (
    <Group>
      {/* Invisible hit area for easier clicking */}
      <Path
        data={pathD}
        stroke="transparent"
        strokeWidth={20}
        fill=""
        listening={true}
        onClick={() => onSelect(edge.id)}
        onTap={() => onSelect(edge.id)}
      />
      {/* Visible connector path */}
      <Path
        data={pathD}
        stroke={edge.color}
        strokeWidth={2}
        fill=""
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
      {/* Arrowhead — solid filled triangle */}
      <Path
        data={arrowD}
        fill={edge.color}
        stroke="none"
        listening={false}
      />
      {/* Label */}
      {edge.label && (() => {
        const labelW = edge.label.length * 7 + 16;
        return (
          <>
            <Rect
              x={mid.x - labelW / 2}
              y={mid.y - 10}
              width={labelW}
              height={20}
              cornerRadius={4}
              fill="white"
              opacity={0.9}
              listening={false}
            />
            <Text
              x={mid.x - labelW / 2}
              y={mid.y - 8}
              width={labelW}
              height={20}
              text={edge.label}
              align="center"
              fontSize={11}
              fontFamily={FONT.family}
              fill="#6b7280"
              listening={false}
            />
          </>
        );
      })()}
      {/* Waypoint handles (only visible when selected) */}
      {isSelected &&
        edge.waypoints.map((wp, i) => (
          <Circle
            key={`wp-${i}`}
            x={wp.x}
            y={wp.y}
            radius={5}
            fill="white"
            stroke="#2563eb"
            strokeWidth={2}
            draggable
            onDragEnd={(e) => {
              onWaypointDrag(edge.id, i, e.target.x(), e.target.y());
            }}
          />
        ))}
      {/* Midpoint handles for adding waypoints (only visible when selected) */}
      {isSelected &&
        allPoints.slice(0, -1).map((pt, i) => {
          const next = allPoints[i + 1];
          const mx = (pt.x + next.x) / 2;
          const my = (pt.y + next.y) / 2;
          return (
            <Circle
              key={`mid-${i}`}
              x={mx}
              y={my}
              radius={4}
              fill="#eff6ff"
              stroke="#93c5fd"
              strokeWidth={1.5}
              opacity={0.8}
              listening={false}
            />
          );
        })}
    </Group>
  );
}
