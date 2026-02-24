/**
 * Global keyboard shortcuts for the diagram canvas.
 * Delete → remove selected, Ctrl+Z → undo, Ctrl+Y/Ctrl+Shift+Z → redo, Escape → deselect.
 */
import { useEffect } from "react";
import { useDiagramStore } from "@/stores/diagram-store";
import { historyManager } from "@/stores/history";
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

      // Delete / Backspace → remove selected shapes
      if (e.key === "Delete" || e.key === "Backspace") {
        const selected = store.selectedNodeIds;
        if (selected.size > 0) {
          e.preventDefault();
          // Push history before delete
          historyManager.push(getCurrentSnapshot());
          store.removeCanvasNodes(Array.from(selected));
        }
      }

      // Escape → deselect
      if (e.key === "Escape") {
        store.deselectAll();
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
