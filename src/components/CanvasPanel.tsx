"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer, Transformer } from "react-konva";
import type Konva from "konva";
import { useDiagramStore } from "@/stores/diagram-store";
import { ShapeRenderer } from "@/shapes/konva/ShapeRenderer";
import { ConnectorShape } from "@/shapes/konva/ConnectorShape";
import { updateNodeInOverlay, updateEdgeInOverlay, addManualEdgeToOverlay } from "@/lib/overlay/diff";
import { computeEdgeEndpoints } from "@/lib/canvas/edge-tracking";
import { computePerimeterAnchor } from "@/lib/canvas/perimeter-anchor";
import { smoothFreehandPoints } from "@/lib/canvas/smoothing";
import { SHAPE_DEFAULTS } from "@/shapes/shared/shape-styles";
import { removeEdgeFromCode, addEdgeToCode } from "@/lib/mermaid/code-patcher";
import { historyManager } from "@/stores/history";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useFreehandDraw } from "@/hooks/useFreehandDraw";
import { SyncBridge } from "./SyncBridge";
import { InlineEditor } from "./InlineEditor";
import { ShapePalette } from "@/ui/ShapePalette";
import { DrawModeToggle } from "@/ui/DrawModeToggle";
import { EdgeToolbar } from "@/ui/EdgeToolbar";
import { FreehandPreview } from "./FreehandPreview";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_SPEED = 1.1;
const SNAP_THRESHOLD = 20;

export default function CanvasPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [previewPoints, setPreviewPoints] = useState<{ x: number; y: number }[]>([]);

  const canvasNodes = useDiagramStore((s) => s.canvasNodes);
  const canvasEdges = useDiagramStore((s) => s.canvasEdges);
  const selectedNodeIds = useDiagramStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useDiagramStore((s) => s.selectedEdgeIds);
  const canvasMode = useDiagramStore((s) => s.canvasMode);
  const selectNode = useDiagramStore((s) => s.selectNode);
  const selectEdge = useDiagramStore((s) => s.selectEdge);
  const deselectAll = useDiagramStore((s) => s.deselectAll);
  const upsertCanvasNode = useDiagramStore((s) => s.upsertCanvasNode);
  const upsertCanvasEdge = useDiagramStore((s) => s.upsertCanvasEdge);
  const updateOverlay = useDiagramStore((s) => s.updateOverlay);

  // Freehand drawing hook
  const { isDrawing, rawPoints, startDraw, continueDraw, endDraw } =
    useFreehandDraw(stageRef);

  // Keyboard shortcuts (Delete, Ctrl+Z, Ctrl+Y, Escape, D)
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

  // Helper: get stage-space coordinates from pointer
  const getStagePointer = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const scale = stage.scaleX();
    return {
      x: (pointer.x - stage.x()) / scale,
      y: (pointer.y - stage.y()) / scale,
    };
  }, []);

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

  // Click background → deselect (or start drawing)
  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (canvasMode === "draw") {
        const pt = getStagePointer();
        if (pt) {
          startDraw(pt.x, pt.y);
          setPreviewPoints([pt]);
        }
        return;
      }

      if (e.target === e.target.getStage()) {
        deselectAll();
      }
    },
    [canvasMode, deselectAll, getStagePointer, startDraw]
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (canvasMode !== "draw" || !isDrawing.current) return;
      const pt = getStagePointer();
      if (pt) {
        const pts = continueDraw(pt.x, pt.y);
        if (pts) {
          setPreviewPoints([...pts]);
        }
      }
    },
    [canvasMode, isDrawing, getStagePointer, continueDraw]
  );

  const handleStageMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (canvasMode !== "draw" && !isDrawing.current) return;
      endDraw();
      setPreviewPoints([]);
    },
    [canvasMode, isDrawing, endDraw]
  );

  // Shape select
  const handleSelect = useCallback(
    (id: string) => {
      if (canvasMode === "draw") return;
      selectNode(id);
    },
    [selectNode, canvasMode]
  );

  // Edge select
  const handleEdgeSelect = useCallback(
    (id: string) => {
      if (canvasMode === "draw") return;
      selectEdge(id);
    },
    [selectEdge, canvasMode]
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

  // Endpoint drag on connector
  const handleEndpointDrag = useCallback(
    (edgeId: string, which: "start" | "end", x: number, y: number) => {
      const state = useDiagramStore.getState();
      const edge = state.canvasEdges.get(edgeId);
      if (!edge) return;

      // Push history on first drag
      historyManager.push({
        overlay: state.overlay,
        canvasNodes: state.canvasNodes,
        canvasEdges: state.canvasEdges,
      });

      // Snap detect
      const zoom = stageRef.current?.scaleX() ?? 1;
      const snapDist = SNAP_THRESHOLD / zoom;
      let snappedNode: { nodeId: string; node: typeof node } | null = null;
      let node: ReturnType<typeof findNearestNode> = null;

      for (const n of state.canvasNodes.values()) {
        const cx = n.x + n.w / 2;
        const cy = n.y + n.h / 2;
        const margin = snapDist;
        if (
          x >= n.x - margin &&
          x <= n.x + n.w + margin &&
          y >= n.y - margin &&
          y <= n.y + n.h + margin
        ) {
          node = n;
          snappedNode = { nodeId: n.nodeId, node: n };
          break;
        }
      }

      const updated = { ...edge };
      if (which === "start") {
        updated.sourceId = snappedNode?.nodeId ?? "";
        if (snappedNode && node) {
          updated.start = computePerimeterAnchor(node, edge.end);
        } else {
          updated.start = { x, y };
        }
      } else {
        updated.targetId = snappedNode?.nodeId ?? "";
        if (snappedNode && node) {
          updated.end = computePerimeterAnchor(node, edge.start);
        } else {
          updated.end = { x, y };
        }
      }

      state.upsertCanvasEdge(updated);

      // Update overlay
      if (edge.origin === "manual") {
        state.updateOverlay((prev) =>
          addManualEdgeToOverlay(prev, edge.edgeId, {
            waypoints: updated.waypoints,
            curveType: updated.curveType,
            rawPoints: updated.rawPoints,
            origin: "manual",
            sourceId: updated.sourceId,
            targetId: updated.targetId,
            arrowStart: updated.arrowStart,
            arrowEnd: updated.arrowEnd,
            smoothing: updated.smoothing,
            color: updated.color,
            linkedMermaidEdgeId: edge.linkedMermaidEdgeId,
          })
        );

        // Sync linked mermaid edge in code when re-anchoring
        if (edge.linkedMermaidEdgeId) {
          const oldSourceId = edge.sourceId;
          const oldTargetId = edge.targetId;
          const newSourceId = updated.sourceId;
          const newTargetId = updated.targetId;

          let code = state.code;
          // Remove old edge from code
          if (oldSourceId && oldTargetId) {
            code = removeEdgeFromCode(code, oldSourceId, oldTargetId);
          }
          // Add new edge if both endpoints attached to mermaid nodes
          if (newSourceId && newTargetId && !newSourceId.startsWith("manual-") && !newTargetId.startsWith("manual-")) {
            code = addEdgeToCode(code, newSourceId, newTargetId);
            const newLinkedId = `${newSourceId}->${newTargetId}`;
            updated.linkedMermaidEdgeId = newLinkedId;
            state.updateOverlay((prev) => {
              const edgeOv = prev.edges[edge.edgeId];
              if (!edgeOv) return prev;
              return {
                ...prev,
                edges: {
                  ...prev.edges,
                  [edge.edgeId]: { ...edgeOv, linkedMermaidEdgeId: newLinkedId },
                },
              };
            });
          } else {
            // No longer connecting two mermaid nodes — unlink
            updated.linkedMermaidEdgeId = undefined;
            state.updateOverlay((prev) => {
              const edgeOv = prev.edges[edge.edgeId];
              if (!edgeOv) return prev;
              return {
                ...prev,
                edges: {
                  ...prev.edges,
                  [edge.edgeId]: { ...edgeOv, linkedMermaidEdgeId: undefined },
                },
              };
            });
          }
          state.setCode(code);
          state.upsertCanvasEdge(updated);
        }
      }
    },
    []
  );

  // Double-click shape → open inline editor
  const handleDblClick = useCallback((id: string) => {
    const startEditing = (window as any).__inlineEditorStart;
    if (startEditing) startEditing(id);
  }, []);

  const nodes = Array.from(canvasNodes.values());
  const edges = Array.from(canvasEdges.values());

  // Get selected edge for toolbar positioning
  const selectedEdgeId = selectedEdgeIds.size > 0 ? Array.from(selectedEdgeIds)[0] : null;
  const selectedEdge = selectedEdgeId ? canvasEdges.get(selectedEdgeId) ?? null : null;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#f8f9fa",
        cursor: canvasMode === "draw" ? "crosshair" : "default",
      }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        draggable={canvasMode !== "draw"}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageMouseDown}
        onTouchMove={handleStageMouseMove}
        onTouchEnd={handleStageMouseUp}
      >
        <Layer>
          {/* Connectors rendered first (behind nodes) */}
          {edges.map((edge) => (
            <ConnectorShape
              key={edge.id}
              edge={edge}
              isSelected={selectedEdgeIds.has(edge.id)}
              onSelect={handleEdgeSelect}
              onWaypointDrag={handleWaypointDrag}
              onEndpointDrag={handleEndpointDrag}
              listening={canvasMode !== "draw"}
              hidden={edge.hidden}
            />
          ))}
          {/* Freehand preview while drawing */}
          {canvasMode === "draw" && previewPoints.length > 1 && (
            <FreehandPreview points={previewPoints} />
          )}
          {/* Nodes */}
          {nodes.map((node) => (
            <ShapeRenderer
              key={node.id}
              node={node}
              isSelected={selectedNodeIds.has(node.id)}
              onSelect={handleSelect}
              onDragEnd={handleDragEnd}
              onDblClick={handleDblClick}
              listening={canvasMode !== "draw"}
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
      <DrawModeToggle />
      {selectedEdge && (
        <EdgeToolbar edge={selectedEdge} stageRef={stageRef} />
      )}
      <InlineEditor stageRef={stageRef} />
      <SyncBridge />
    </div>
  );
}

function findNearestNode(
  point: { x: number; y: number },
  nodes: Map<string, any>,
  maxDist: number
) {
  for (const n of nodes.values()) {
    const margin = maxDist;
    if (
      point.x >= n.x - margin &&
      point.x <= n.x + n.w + margin &&
      point.y >= n.y - margin &&
      point.y <= n.y + n.h + margin
    ) {
      return n;
    }
  }
  return null;
}
