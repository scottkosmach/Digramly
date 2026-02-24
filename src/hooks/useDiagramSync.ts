/**
 * Bidirectional sync orchestrator.
 *
 * Code → Canvas: When parsedGraph changes, merge with overlay,
 *   create/update canvas nodes and edges in Zustand store.
 * Canvas → Overlay: Handled by drag/resize event handlers in CanvasPanel.
 */
import { useEffect, useRef, useCallback } from "react";
import { useDiagramStore } from "@/stores/diagram-store";
import { layoutGraph } from "@/lib/layout/elk-layout";
import { mergeGraphWithOverlay } from "@/lib/overlay/merge";
import { updateNodeInOverlay, updateEdgeInOverlay, cleanupOverlay } from "@/lib/overlay/diff";
import { computeEdgeEndpoints } from "@/lib/canvas/edge-tracking";
import type { StagedNode } from "@/lib/overlay/staging";
import type { CanvasNodeState, CanvasEdgeState, NodeShapeType } from "@/shapes/shape-types";
import type { MermaidNodeShape } from "@/lib/mermaid/types";
import { MERMAID_SHAPE_TO_TYPE } from "@/lib/mermaid/types";
import { SHAPE_DEFAULTS } from "@/shapes/shared/shape-styles";

/**
 * Hook that syncs mermaid graph → Zustand canvas state → overlay.
 * Works directly with Zustand store (no canvas context needed).
 */
export function useDiagramSync() {
  const parsedGraph = useDiagramStore((s) => s.parsedGraph);
  const overlay = useDiagramStore((s) => s.overlay);
  const updateOverlay = useDiagramStore((s) => s.updateOverlay);
  const setStagedNodes = useDiagramStore((s) => s.setStagedNodes);
  const setSyncStatus = useDiagramStore((s) => s.setSyncStatus);
  const upsertCanvasNodes = useDiagramStore((s) => s.upsertCanvasNodes);
  const upsertCanvasEdges = useDiagramStore((s) => s.upsertCanvasEdges);
  const removeCanvasNodes = useDiagramStore((s) => s.removeCanvasNodes);
  const removeCanvasEdges = useDiagramStore((s) => s.removeCanvasEdges);

  // Prevent re-entrant sync
  const isSyncingRef = useRef(false);
  // Track nodeId→canvasId mapping
  const nodeIdMapRef = useRef<Map<string, string>>(new Map());
  const edgeIdMapRef = useRef<Map<string, string>>(new Map());

  // ─── Code → Canvas sync ───────────────────────────────────────
  useEffect(() => {
    if (!parsedGraph || isSyncingRef.current) return;

    const syncToCanvas = async () => {
      isSyncingRef.current = true;
      setSyncStatus("syncing");

      try {
        const layout = await layoutGraph(parsedGraph);
        const mergeResult = mergeGraphWithOverlay(parsedGraph, overlay, layout);

        // --- Create/update node canvas state ---
        const nodesToUpsert: CanvasNodeState[] = [];
        const currentNodeIds = new Set<string>();

        for (const node of mergeResult.positionedNodes) {
          // Reuse existing canvas ID or create new one
          let canvasId = nodeIdMapRef.current.get(node.nodeId);
          if (!canvasId) {
            canvasId = crypto.randomUUID();
            nodeIdMapRef.current.set(node.nodeId, canvasId);
          }
          currentNodeIds.add(canvasId);

          nodesToUpsert.push({
            id: canvasId,
            nodeId: node.nodeId,
            shapeType: node.shapeType as NodeShapeType,
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h,
            label: node.label,
            color: (node.color as any) || "blue",
          });

          // Record in overlay
          updateOverlay((prev) =>
            updateNodeInOverlay(prev, node.nodeId, {
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h,
            })
          );
        }

        // Batch upsert nodes
        if (nodesToUpsert.length > 0) {
          upsertCanvasNodes(nodesToUpsert);
        }

        // Build node lookup for edge endpoint computation
        const nodeMap = new Map<string, CanvasNodeState>();
        for (const n of nodesToUpsert) nodeMap.set(n.id, n);

        // --- Create/update edge canvas state ---
        const edgesToUpsert: CanvasEdgeState[] = [];
        const currentEdgeIds = new Set<string>();

        for (const edge of mergeResult.edges) {
          let canvasId = edgeIdMapRef.current.get(edge.edgeId);
          if (!canvasId) {
            canvasId = crypto.randomUUID();
            edgeIdMapRef.current.set(edge.edgeId, canvasId);
          }
          currentEdgeIds.add(canvasId);

          // Find positioned source/target for endpoint calc
          const sourceNode = mergeResult.positionedNodes.find(
            (n) => n.nodeId === edge.sourceId
          );
          const targetNode = mergeResult.positionedNodes.find(
            (n) => n.nodeId === edge.targetId
          );

          if (!sourceNode || !targetNode) continue;

          const start = {
            x: sourceNode.x + sourceNode.w / 2,
            y: sourceNode.y + sourceNode.h,
          };
          const end = {
            x: targetNode.x + targetNode.w / 2,
            y: targetNode.y,
          };

          const edgeState: CanvasEdgeState = {
            id: canvasId,
            edgeId: edge.edgeId,
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            start,
            end,
            waypoints: edge.waypoints,
            curveType: edge.curveType,
            label: edge.label,
            color: "#374151",
          };

          // Use edge-tracking for smarter endpoint placement
          const endpoints = computeEdgeEndpoints(edgeState, nodeMap);
          if (endpoints) {
            edgeState.start = endpoints.start;
            edgeState.end = endpoints.end;
          }

          edgesToUpsert.push(edgeState);

          updateOverlay((prev) =>
            updateEdgeInOverlay(prev, edge.edgeId, {
              waypoints: edge.waypoints,
              curveType: edge.curveType,
            })
          );
        }

        if (edgesToUpsert.length > 0) {
          upsertCanvasEdges(edgesToUpsert);
        }

        // --- Remove nodes/edges that no longer exist ---
        const nodeIdsToRemove: string[] = [];
        for (const nodeId of mergeResult.removedNodeIds) {
          const canvasId = nodeIdMapRef.current.get(nodeId);
          if (canvasId) {
            nodeIdsToRemove.push(canvasId);
            nodeIdMapRef.current.delete(nodeId);
          }
        }
        if (nodeIdsToRemove.length > 0) {
          removeCanvasNodes(nodeIdsToRemove);
        }

        const edgeIdsToRemove: string[] = [];
        for (const edgeId of mergeResult.removedEdgeIds) {
          const canvasId = edgeIdMapRef.current.get(edgeId);
          if (canvasId) {
            edgeIdsToRemove.push(canvasId);
            edgeIdMapRef.current.delete(edgeId);
          }
        }
        if (edgeIdsToRemove.length > 0) {
          removeCanvasEdges(edgeIdsToRemove);
        }

        // Clean up overlay
        if (mergeResult.removedNodeIds.length > 0 || mergeResult.removedEdgeIds.length > 0) {
          updateOverlay((prev) =>
            cleanupOverlay(prev, mergeResult.removedNodeIds, mergeResult.removedEdgeIds)
          );
        }

        // Update staging
        const staged: StagedNode[] = mergeResult.stagedNodes.map((n) => ({
          ...n,
          stagedAt: Date.now(),
        }));
        setStagedNodes(staged);
      } finally {
        isSyncingRef.current = false;
        setSyncStatus("idle");
      }
    };

    syncToCanvas();
  }, [parsedGraph]); // Only re-run when parsedGraph changes

  // ─── Place staged node on canvas ──────────────────────────────
  const placeStagedNode = useCallback(
    (nodeId: string, x: number, y: number) => {
      const store = useDiagramStore.getState();
      const staged = store.stagedNodes.find((n) => n.id === nodeId);
      if (!staged) return;

      const shapeType = (MERMAID_SHAPE_TO_TYPE[staged.shape] || "box") as NodeShapeType;
      const w = SHAPE_DEFAULTS.w;
      const h = SHAPE_DEFAULTS.h;
      const canvasId = crypto.randomUUID();

      nodeIdMapRef.current.set(nodeId, canvasId);

      store.upsertCanvasNode({
        id: canvasId,
        nodeId,
        shapeType,
        x,
        y,
        w,
        h,
        label: staged.label,
        color: "blue",
      });

      store.updateOverlay((prev) =>
        updateNodeInOverlay(prev, nodeId, { x, y, w, h })
      );

      store.removeStagedNode(nodeId);
    },
    []
  );

  // ─── Place all staged nodes ───────────────────────────────────
  const placeAllStagedNodes = useCallback(() => {
    const store = useDiagramStore.getState();
    const staged = store.stagedNodes;
    if (staged.length === 0) return;

    // Find a clear area on canvas (below existing shapes)
    let maxY = 0;
    for (const n of store.canvasNodes.values()) {
      const bottom = n.y + n.h;
      if (bottom > maxY) maxY = bottom;
    }

    const startY = maxY + 60;
    const startX = 50;

    staged.forEach((node, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      placeStagedNode(
        node.id,
        startX + col * 200,
        startY + row * 100
      );
    });
  }, [placeStagedNode]);

  return { placeStagedNode, placeAllStagedNodes };
}
