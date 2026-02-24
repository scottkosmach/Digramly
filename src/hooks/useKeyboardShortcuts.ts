/**
 * Global keyboard shortcuts for the diagram canvas.
 * Delete → remove selected, Ctrl+Z → undo, Ctrl+Y/Ctrl+Shift+Z → redo,
 * Escape → deselect + exit draw mode, D → toggle draw mode.
 */
import { useEffect } from "react";
import { useDiagramStore } from "@/stores/diagram-store";
import { historyManager } from "@/stores/history";
import { removeManualEdgeFromOverlay } from "@/lib/overlay/diff";
import type { HistorySnapshot } from "@/stores/history";

function getCurrentSnapshot(): HistorySnapshot {
  const state = useDiagramStore.getState();
  return {
    overlay: state.overlay,
    canvasNodes: state.canvasNodes,
    canvasEdges: state.canvasEdges,
  };
}

function applySnapshot(snapshot: HistorySnapshot) {
  const store = useDiagramStore.getState();
  store.setOverlay(snapshot.overlay);
  // Replace canvasNodes and canvasEdges directly via set
  useDiagramStore.setState({
    canvasNodes: snapshot.canvasNodes,
    canvasEdges: snapshot.canvasEdges,
  });
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const store = useDiagramStore.getState();

      // Delete / Backspace → remove selected shapes and/or edges
      if (e.key === "Delete" || e.key === "Backspace") {
        const selectedNodes = store.selectedNodeIds;
        const selectedEdges = store.selectedEdgeIds;

        if (selectedNodes.size > 0 || selectedEdges.size > 0) {
          e.preventDefault();
          historyManager.push(getCurrentSnapshot());

          // Delete selected nodes
          if (selectedNodes.size > 0) {
            // Detach freehand edges connected to deleted nodes
            const deletedNodeIds = new Set<string>();
            for (const canvasId of selectedNodes) {
              const node = store.canvasNodes.get(canvasId);
              if (node) deletedNodeIds.add(node.nodeId);
            }

            // Detach edges connected to deleted nodes
            for (const edge of store.canvasEdges.values()) {
              if (edge.origin === "manual") {
                let updated = edge;
                let changed = false;
                if (deletedNodeIds.has(edge.sourceId)) {
                  updated = { ...updated, sourceId: "" };
                  changed = true;
                }
                if (deletedNodeIds.has(edge.targetId)) {
                  updated = { ...updated, targetId: "" };
                  changed = true;
                }
                if (changed) {
                  store.upsertCanvasEdge(updated);
                }
              }
            }

            store.removeCanvasNodes(Array.from(selectedNodes));
          }

          // Delete selected edges
          if (selectedEdges.size > 0) {
            const edgeIdsToRemove: string[] = [];
            for (const edgeCanvasId of selectedEdges) {
              const edge = store.canvasEdges.get(edgeCanvasId);
              if (!edge) continue;

              if (edge.origin === "manual") {
                // Remove manual edge entirely
                edgeIdsToRemove.push(edgeCanvasId);
                store.updateOverlay((prev) =>
                  removeManualEdgeFromOverlay(prev, edge.edgeId)
                );
              } else {
                // Mermaid edge: just deselect (can't delete code-generated edges)
                // Could optionally hide it, but for now just deselect
              }
            }
            if (edgeIdsToRemove.length > 0) {
              store.removeCanvasEdges(edgeIdsToRemove);
            }
            useDiagramStore.setState({ selectedEdgeIds: new Set() });
          }
        }
      }

      // Escape → deselect + exit draw mode
      if (e.key === "Escape") {
        store.deselectAll();
        if (store.canvasMode === "draw") {
          store.setCanvasMode("select");
        }
      }

      // D → toggle draw mode
      if (e.key === "d" || e.key === "D") {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          store.setCanvasMode(store.canvasMode === "draw" ? "select" : "draw");
        }
      }

      // Ctrl+Z → undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        const snapshot = historyManager.undo(getCurrentSnapshot());
        if (snapshot) applySnapshot(snapshot);
      }

      // Ctrl+Y or Ctrl+Shift+Z → redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z")
      ) {
        e.preventDefault();
        const snapshot = historyManager.redo(getCurrentSnapshot());
        if (snapshot) applySnapshot(snapshot);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
