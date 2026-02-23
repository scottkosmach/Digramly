/**
 * Bidirectional sync orchestrator.
 *
 * Code → Canvas: When parsedGraph changes, merge with overlay, create/update/remove shapes.
 * Canvas → Overlay: When shapes move/resize, update overlay positions.
 */
import { useEffect, useRef, useCallback } from "react";
import { useEditor, createShapeId } from "tldraw";
import type { TLShapeId } from "tldraw";
import { useDiagramStore } from "@/stores/diagram-store";
import { layoutGraph } from "@/lib/layout/elk-layout";
import { mergeGraphWithOverlay } from "@/lib/overlay/merge";
import type { CanvasNode, CanvasEdge } from "@/lib/overlay/merge";
import { updateNodeInOverlay, updateEdgeInOverlay, cleanupOverlay } from "@/lib/overlay/diff";
import type { StagedNode } from "@/lib/overlay/staging";
import type { DiagramNodeShape, ConnectorShape } from "@/shapes/diagram-shapes";

/**
 * Hook that syncs mermaid graph ↔ tldraw canvas ↔ overlay.
 * Must be used inside a tldraw <Tldraw> context.
 */
export function useDiagramSync() {
  const editor = useEditor();
  const parsedGraph = useDiagramStore((s) => s.parsedGraph);
  const overlay = useDiagramStore((s) => s.overlay);
  const setOverlay = useDiagramStore((s) => s.setOverlay);
  const updateOverlay = useDiagramStore((s) => s.updateOverlay);
  const setStagedNodes = useDiagramStore((s) => s.setStagedNodes);
  const setSyncStatus = useDiagramStore((s) => s.setSyncStatus);
  const isSyncingToOverlay = useDiagramStore((s) => s.isSyncingToOverlay);
  const setIsSyncingToOverlay = useDiagramStore((s) => s.setIsSyncingToOverlay);

  // Track shape IDs we've created (nodeId/edgeId → tldraw shape ID)
  const shapeMapRef = useRef<Map<string, TLShapeId>>(new Map());
  // Prevent re-entrant sync
  const isSyncingRef = useRef(false);

  // ─── Code → Canvas sync ───────────────────────────────────────
  useEffect(() => {
    if (!parsedGraph || isSyncingRef.current) return;

    const syncToCanvas = async () => {
      isSyncingRef.current = true;
      setSyncStatus("syncing");

      try {
        // Run ELK layout for positioning new nodes
        const layout = await layoutGraph(parsedGraph);

        // Merge parsed graph + overlay + layout
        const mergeResult = mergeGraphWithOverlay(parsedGraph, overlay, layout);

        // --- Create/update node shapes ---
        const shapesToCreate: any[] = [];
        const shapesToUpdate: any[] = [];

        for (const node of mergeResult.positionedNodes) {
          const existingId = node.tldrawShapeId
            ? (node.tldrawShapeId as TLShapeId)
            : shapeMapRef.current.get(node.nodeId);

          if (existingId && editor.getShape(existingId)) {
            // Update existing shape
            shapesToUpdate.push({
              id: existingId,
              type: node.shapeType,
              x: node.x,
              y: node.y,
              props: {
                w: node.w,
                h: node.h,
                label: node.label,
                nodeId: node.nodeId,
              },
            });
          } else {
            // Create new shape
            const id = createShapeId();
            shapeMapRef.current.set(node.nodeId, id);
            shapesToCreate.push({
              id,
              type: node.shapeType,
              x: node.x,
              y: node.y,
              props: {
                w: node.w,
                h: node.h,
                label: node.label,
                color: node.color || "blue",
                nodeId: node.nodeId,
              },
            });

            // Also record in overlay so subsequent syncs know about it
            updateOverlay((prev) =>
              updateNodeInOverlay(prev, node.nodeId, {
                x: node.x,
                y: node.y,
                w: node.w,
                h: node.h,
                tldrawShapeId: id,
              })
            );
          }
        }

        // --- Create/update edge (connector) shapes ---
        for (const edge of mergeResult.edges) {
          const existingId = edge.tldrawShapeId
            ? (edge.tldrawShapeId as TLShapeId)
            : shapeMapRef.current.get(edge.edgeId);

          // Calculate start/end positions from source/target node positions
          const sourceNode = mergeResult.positionedNodes.find(
            (n) => n.nodeId === edge.sourceId
          );
          const targetNode = mergeResult.positionedNodes.find(
            (n) => n.nodeId === edge.targetId
          );

          if (!sourceNode || !targetNode) continue;

          // Connect from bottom-center of source to top-center of target (for TD direction)
          const start = { x: sourceNode.x + sourceNode.w / 2, y: sourceNode.y + sourceNode.h };
          const end = { x: targetNode.x + targetNode.w / 2, y: targetNode.y };

          if (existingId && editor.getShape(existingId)) {
            shapesToUpdate.push({
              id: existingId,
              type: "diagram-connector",
              props: {
                start,
                end,
                waypoints: edge.waypoints,
                label: edge.label,
                edgeId: edge.edgeId,
              },
            });
          } else {
            const id = createShapeId();
            shapeMapRef.current.set(edge.edgeId, id);
            shapesToCreate.push({
              id,
              type: "diagram-connector",
              x: 0,
              y: 0,
              props: {
                start,
                end,
                waypoints: edge.waypoints,
                curveType: edge.curveType,
                label: edge.label,
                edgeId: edge.edgeId,
                color: "#374151",
              },
            });

            updateOverlay((prev) =>
              updateEdgeInOverlay(prev, edge.edgeId, {
                waypoints: edge.waypoints,
                curveType: edge.curveType,
                tldrawShapeId: id,
              })
            );
          }
        }

        // --- Remove shapes for deleted nodes/edges ---
        const shapesToRemove: TLShapeId[] = [];
        for (const nodeId of mergeResult.removedNodeIds) {
          const shapeId = shapeMapRef.current.get(nodeId);
          if (shapeId) {
            shapesToRemove.push(shapeId);
            shapeMapRef.current.delete(nodeId);
          }
        }
        for (const edgeId of mergeResult.removedEdgeIds) {
          const shapeId = shapeMapRef.current.get(edgeId);
          if (shapeId) {
            shapesToRemove.push(shapeId);
            shapeMapRef.current.delete(edgeId);
          }
        }

        // Apply all changes in a batch
        if (shapesToCreate.length > 0) {
          editor.createShapes(shapesToCreate);
        }
        if (shapesToUpdate.length > 0) {
          editor.updateShapes(shapesToUpdate);
        }
        if (shapesToRemove.length > 0) {
          editor.deleteShapes(shapesToRemove);
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

  // ─── Canvas → Overlay sync ────────────────────────────────────
  // Listen to tldraw store changes and update overlay positions
  useEffect(() => {
    const unsubscribe = editor.store.listen(
      ({ changes }) => {
        // Don't sync if we're currently pushing code→canvas
        if (isSyncingRef.current) return;

        const { updated } = changes;
        if (!updated) return;

        let overlayChanged = false;
        let newOverlay = useDiagramStore.getState().overlay;

        for (const [_from, to] of Object.values(updated)) {
          const shape = to as any;
          if (!shape.typeName || shape.typeName !== "shape") continue;

          // Node shapes → update position in overlay
          if (shape.type?.startsWith("diagram-") && shape.type !== "diagram-connector") {
            const nodeId = shape.props?.nodeId;
            if (!nodeId) continue;

            newOverlay = updateNodeInOverlay(newOverlay, nodeId, {
              x: shape.x,
              y: shape.y,
              w: shape.props.w,
              h: shape.props.h,
              tldrawShapeId: shape.id,
            });
            overlayChanged = true;
          }

          // Connector shapes → update waypoints in overlay
          if (shape.type === "diagram-connector") {
            const edgeId = shape.props?.edgeId;
            if (!edgeId) continue;

            newOverlay = updateEdgeInOverlay(newOverlay, edgeId, {
              waypoints: shape.props.waypoints,
              curveType: shape.props.curveType,
              tldrawShapeId: shape.id,
            });
            overlayChanged = true;
          }
        }

        if (overlayChanged) {
          setOverlay(newOverlay);
        }
      },
      { source: "user", scope: "document" }
    );

    return unsubscribe;
  }, [editor, setOverlay]);

  // ─── Place staged node on canvas ──────────────────────────────
  const placeStagedNode = useCallback(
    (nodeId: string, x: number, y: number) => {
      const store = useDiagramStore.getState();
      const staged = store.stagedNodes.find((n) => n.id === nodeId);
      if (!staged) return;

      const id = createShapeId();
      const shapeType =
        staged.shape === "box"
          ? "diagram-box"
          : staged.shape === "round"
            ? "diagram-rounded-rect"
            : staged.shape === "diamond"
              ? "diagram-diamond"
              : staged.shape === "cylinder"
                ? "diagram-cylinder"
                : staged.shape === "circle"
                  ? "diagram-circle"
                  : staged.shape === "stadium"
                    ? "diagram-stadium"
                    : "diagram-box";

      const w = 160;
      const h = 70;

      editor.createShapes([
        {
          id,
          type: shapeType,
          x,
          y,
          props: {
            w,
            h,
            label: staged.label,
            color: "blue",
            nodeId: staged.id,
          },
        },
      ]);

      shapeMapRef.current.set(nodeId, id);

      updateOverlay((prev) =>
        updateNodeInOverlay(prev, nodeId, {
          x,
          y,
          w,
          h,
          tldrawShapeId: id,
        })
      );

      store.removeStagedNode(nodeId);
    },
    [editor, updateOverlay]
  );

  // ─── Place all staged nodes ───────────────────────────────────
  const placeAllStagedNodes = useCallback(() => {
    const store = useDiagramStore.getState();
    const staged = store.stagedNodes;
    if (staged.length === 0) return;

    // Find a clear area on canvas (below existing shapes)
    const allShapes = editor.getCurrentPageShapes();
    let maxY = 0;
    for (const s of allShapes) {
      const bounds = editor.getShapeGeometry(s).bounds;
      const shapeBottom = s.y + bounds.h;
      if (shapeBottom > maxY) maxY = shapeBottom;
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
  }, [editor, placeStagedNode]);

  return { placeStagedNode, placeAllStagedNodes };
}
