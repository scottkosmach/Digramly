/**
 * Hook managing freehand line drawing lifecycle.
 * Collects raw points on mousemove, snaps endpoints to shapes,
 * creates CanvasEdgeState with origin: "manual".
 */
import { useRef, useCallback } from "react";
import type Konva from "konva";
import { useDiagramStore } from "@/stores/diagram-store";
import { smoothFreehandPoints } from "@/lib/canvas/smoothing";
import { computePerimeterAnchor } from "@/lib/canvas/perimeter-anchor";
import { addManualEdgeToOverlay } from "@/lib/overlay/diff";
import { historyManager } from "@/stores/history";
import type { CanvasEdgeState, CanvasNodeState } from "@/shapes/shape-types";

interface Point {
  x: number;
  y: number;
}

const MAX_POINTS = 2000;
const SNAP_THRESHOLD = 20; // pixels (before zoom adjustment)
const DEFAULT_SMOOTHING = 0.5;

export function useFreehandDraw(stageRef: React.RefObject<Konva.Stage | null>) {
  const isDrawingRef = useRef(false);
  const rawPointsRef = useRef<Point[]>([]);

  const startDraw = useCallback(
    (stageX: number, stageY: number) => {
      isDrawingRef.current = true;
      rawPointsRef.current = [{ x: stageX, y: stageY }];
    },
    []
  );

  const continueDraw = useCallback(
    (stageX: number, stageY: number): Point[] | null => {
      if (!isDrawingRef.current) return null;
      if (rawPointsRef.current.length >= MAX_POINTS) return rawPointsRef.current;
      rawPointsRef.current.push({ x: stageX, y: stageY });
      return rawPointsRef.current;
    },
    []
  );

  const endDraw = useCallback((): void => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const rawPoints = rawPointsRef.current;
    rawPointsRef.current = [];

    // Need at least 2 points to form a line
    if (rawPoints.length < 2) return;

    const store = useDiagramStore.getState();

    // Push history before creating edge
    historyManager.push({
      overlay: store.overlay,
      canvasNodes: store.canvasNodes,
      canvasEdges: store.canvasEdges,
    });

    // Snap-detect endpoints near shapes
    const zoom = stageRef.current?.scaleX() ?? 1;
    const snapDist = SNAP_THRESHOLD / zoom;
    const startPt = rawPoints[0];
    const endPt = rawPoints[rawPoints.length - 1];

    const sourceNode = findNearestNode(startPt, store.canvasNodes, snapDist);
    const targetNode = findNearestNode(endPt, store.canvasNodes, snapDist);

    // Smooth the raw points
    const smoothed = smoothFreehandPoints(rawPoints, DEFAULT_SMOOTHING);

    // Compute perimeter-snapped start/end
    let start = startPt;
    let end = endPt;
    if (sourceNode) {
      start = computePerimeterAnchor(sourceNode, endPt);
    }
    if (targetNode) {
      end = computePerimeterAnchor(targetNode, startPt);
    }

    const edgeId = `freehand::${crypto.randomUUID()}`;
    const canvasId = crypto.randomUUID();

    const edge: CanvasEdgeState = {
      id: canvasId,
      edgeId,
      sourceId: sourceNode?.nodeId ?? "",
      targetId: targetNode?.nodeId ?? "",
      start,
      end,
      waypoints: smoothed,
      curveType: "freehand",
      label: "",
      color: "#374151",
      origin: "manual",
      arrowStart: "none",
      arrowEnd: "arrow",
      rawPoints,
      smoothing: DEFAULT_SMOOTHING,
    };

    store.upsertCanvasEdge(edge);

    // Save to overlay
    store.updateOverlay((prev) =>
      addManualEdgeToOverlay(prev, edgeId, {
        waypoints: smoothed,
        curveType: "freehand",
        rawPoints,
        origin: "manual",
        sourceId: sourceNode?.nodeId ?? "",
        targetId: targetNode?.nodeId ?? "",
        arrowStart: "none",
        arrowEnd: "arrow",
        smoothing: DEFAULT_SMOOTHING,
        color: "#374151",
      })
    );

    // Auto-select the new edge and return to select mode
    store.selectEdge(canvasId);
    store.setCanvasMode("select");
  }, [stageRef]);

  return {
    isDrawing: isDrawingRef,
    rawPoints: rawPointsRef,
    startDraw,
    continueDraw,
    endDraw,
  };
}

function findNearestNode(
  point: Point,
  nodes: Map<string, CanvasNodeState>,
  maxDist: number
): CanvasNodeState | null {
  let nearest: CanvasNodeState | null = null;
  let nearestDist = maxDist;

  for (const node of nodes.values()) {
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;

    // Check if point is near the shape bounding box (with margin)
    const margin = maxDist;
    if (
      point.x >= node.x - margin &&
      point.x <= node.x + node.w + margin &&
      point.y >= node.y - margin &&
      point.y <= node.y + node.h + margin
    ) {
      const dist = Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2);
      if (dist < nearestDist + Math.max(node.w, node.h) / 2) {
        nearest = node;
        nearestDist = dist;
      }
    }
  }

  return nearest;
}
