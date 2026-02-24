"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer, Transformer } from "react-konva";
import type Konva from "konva";
import { useDiagramStore } from "@/stores/diagram-store";
import { ShapeRenderer } from "@/shapes/konva/ShapeRenderer";
import { ConnectorShape } from "@/shapes/konva/ConnectorShape";
import { updateNodeInOverlay, updateEdgeInOverlay } from "@/lib/overlay/diff";
import { computeEdgeEndpoints } from "@/lib/canvas/edge-tracking";
import { SHAPE_DEFAULTS } from "@/shapes/shared/shape-styles";
import { historyManager } from "@/stores/history";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { SyncBridge } from "./SyncBridge";
import { InlineEditor } from "./InlineEditor";
import { ShapePalette } from "@/ui/ShapePalette";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_SPEED = 1.1;

export default function CanvasPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const canvasNodes = useDiagramStore((s) => s.canvasNodes);
  const canvasEdges = useDiagramStore((s) => s.canvasEdges);
  const selectedNodeIds = useDiagramStore((s) => s.selectedNodeIds);
  const selectNode = useDiagramStore((s) => s.selectNode);
  const deselectAll = useDiagramStore((s) => s.deselectAll);
  const upsertCanvasNode = useDiagramStore((s) => s.upsertCanvasNode);
  const upsertCanvasEdge = useDiagramStore((s) => s.upsertCanvasEdge);
  const updateOverlay = useDiagramStore((s) => s.updateOverlay);

  // Track which edge is selected (separate from node selection)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Keyboard shortcuts (Delete, Ctrl+Z, Ctrl+Y, Escape)
  useKeyboardShortcuts();

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    ro.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Attach Transformer to selected nodes
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;

    const selectedNodes: Konva.Node[] = [];
    selectedNodeIds.forEach((id) => {
      const node = stage.findOne(`#${id}`);
      if (node) selectedNodes.push(node);
    });

    transformer.nodes(selectedNodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedNodeIds, canvasNodes]);

  // Wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, direction > 0 ? oldScale * ZOOM_SPEED : oldScale / ZOOM_SPEED)
    );

    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    stage.batchDraw();
  }, []);

  // Click background → deselect
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target === e.target.getStage()) {
        deselectAll();
        setSelectedEdgeId(null);
      }
    },
    [deselectAll]
  );

  // Shape select
  const handleSelect = useCallback(
    (id: string) => {
      selectNode(id);
      setSelectedEdgeId(null);
    },
    [selectNode]
  );

  // Edge select
  const handleEdgeSelect = useCallback(
    (id: string) => {
      setSelectedEdgeId(id);
      deselectAll();
    },
    [deselectAll]
  );

  // Shape drag end → update store + overlay + recompute edges
  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      const state = useDiagramStore.getState();
      const node = state.canvasNodes.get(id);
      if (!node) return;

      // Push history before mutation
      historyManager.push({
        overlay: state.overlay,
        canvasNodes: state.canvasNodes,
        canvasEdges: state.canvasEdges,
      });

      const updated = { ...node, x, y };
      upsertCanvasNode(updated);
      updateOverlay((prev) =>
        updateNodeInOverlay(prev, node.nodeId, { x, y, w: node.w, h: node.h })
      );

      // Recompute edges connected to this node
      const nextNodes = new Map(state.canvasNodes);
      nextNodes.set(id, updated);
      for (const edge of state.canvasEdges.values()) {
        if (edge.sourceId === node.nodeId || edge.targetId === node.nodeId) {
          const endpoints = computeEdgeEndpoints(edge, nextNodes);
          if (endpoints) {
            const updatedEdge = { ...edge, ...endpoints };
            useDiagramStore.getState().upsertCanvasEdge(updatedEdge);
          }
        }
      }
    },
    [upsertCanvasNode, updateOverlay]
  );

  // Transform end
  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>) => {
      const konvaNode = e.target;
      const id = konvaNode.id();
      const state = useDiagramStore.getState();
      const node = state.canvasNodes.get(id);
      if (!node) return;

      // Push history before mutation
      historyManager.push({
        overlay: state.overlay,
        canvasNodes: state.canvasNodes,
        canvasEdges: state.canvasEdges,
      });

      const scaleX = konvaNode.scaleX();
      const scaleY = konvaNode.scaleY();

      const newW = Math.max(SHAPE_DEFAULTS.minW, Math.round(node.w * scaleX));
      const newH = Math.max(SHAPE_DEFAULTS.minH, Math.round(node.h * scaleY));
      const newX = konvaNode.x();
      const newY = konvaNode.y();

      konvaNode.scaleX(1);
      konvaNode.scaleY(1);

      const updated = { ...node, x: newX, y: newY, w: newW, h: newH };
      upsertCanvasNode(updated);
      updateOverlay((prev) =>
        updateNodeInOverlay(prev, node.nodeId, {
          x: newX,
          y: newY,
          w: newW,
          h: newH,
        })
      );

      // Recompute edges connected to this node
      const nextNodes = new Map(state.canvasNodes);
      nextNodes.set(id, updated);
      for (const edge of state.canvasEdges.values()) {
        if (edge.sourceId === node.nodeId || edge.targetId === node.nodeId) {
          const endpoints = computeEdgeEndpoints(edge, nextNodes);
          if (endpoints) {
            useDiagramStore.getState().upsertCanvasEdge({ ...edge, ...endpoints });
          }
        }
      }
    },
    [upsertCanvasNode, updateOverlay]
  );

  // Waypoint drag on connector
  const handleWaypointDrag = useCallback(
    (edgeId: string, wpIndex: number, x: number, y: number) => {
      const edge = useDiagramStore.getState().canvasEdges.get(edgeId);
      if (!edge) return;
      const newWaypoints = [...edge.waypoints];
      newWaypoints[wpIndex] = { x, y };
      const updated = { ...edge, waypoints: newWaypoints };
      upsertCanvasEdge(updated);
      updateOverlay((prev) =>
        updateEdgeInOverlay(prev, edge.edgeId, {
          waypoints: newWaypoints,
          curveType: edge.curveType,
        })
      );
    },
    [upsertCanvasEdge, updateOverlay]
  );

  // Double-click shape → open inline editor
  const handleDblClick = useCallback((id: string) => {
    const startEditing = (window as any).__inlineEditorStart;
    if (startEditing) startEditing(id);
  }, []);

  const nodes = Array.from(canvasNodes.values());
  const edges = Array.from(canvasEdges.values());

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#f8f9fa",
      }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        draggable
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer>
          {/* Connectors rendered first (behind nodes) */}
          {edges.map((edge) => (
            <ConnectorShape
              key={edge.id}
              edge={edge}
              isSelected={selectedEdgeId === edge.id}
              onSelect={handleEdgeSelect}
              onWaypointDrag={handleWaypointDrag}
            />
          ))}
          {/* Nodes */}
          {nodes.map((node) => (
            <ShapeRenderer
              key={node.id}
              node={node}
              isSelected={selectedNodeIds.has(node.id)}
              onSelect={handleSelect}
              onDragEnd={handleDragEnd}
              onDblClick={handleDblClick}
            />
          ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            enabledAnchors={[
              "top-left",
              "top-center",
              "top-right",
              "middle-left",
              "middle-right",
              "bottom-left",
              "bottom-center",
              "bottom-right",
            ]}
            boundBoxFunc={(_oldBox, newBox) => {
              if (newBox.width < SHAPE_DEFAULTS.minW) newBox.width = SHAPE_DEFAULTS.minW;
              if (newBox.height < SHAPE_DEFAULTS.minH) newBox.height = SHAPE_DEFAULTS.minH;
              return newBox;
            }}
            borderStroke="#2563eb"
            borderStrokeWidth={1.5}
            anchorFill="#fff"
            anchorStroke="#2563eb"
            anchorSize={8}
            anchorCornerRadius={2}
            onTransformEnd={handleTransformEnd}
          />
        </Layer>
      </Stage>
      <ShapePalette />
      <InlineEditor stageRef={stageRef} />
      <SyncBridge />
    </div>
  );
}
