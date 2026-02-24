/**
 * Custom undo/redo history manager.
 * Stores snapshots of canvas state (nodes, edges, overlay).
 */
import type { DiagramOverlay } from "@/lib/overlay/types";
import type { CanvasNodeState, CanvasEdgeState } from "@/shapes/shape-types";

export interface HistorySnapshot {
  overlay: DiagramOverlay;
  canvasNodes: Map<string, CanvasNodeState>;
  canvasEdges: Map<string, CanvasEdgeState>;
}

const MAX_HISTORY = 50;

export class HistoryManager {
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];

  push(snapshot: HistorySnapshot) {
    this.undoStack.push(cloneSnapshot(snapshot));
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    // Any new action clears redo
    this.redoStack = [];
  }

  undo(current: HistorySnapshot): HistorySnapshot | null {
    const prev = this.undoStack.pop();
    if (!prev) return null;
    this.redoStack.push(cloneSnapshot(current));
    return prev;
  }

  redo(current: HistorySnapshot): HistorySnapshot | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(cloneSnapshot(current));
    return next;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

function cloneSnapshot(s: HistorySnapshot): HistorySnapshot {
  return {
    overlay: JSON.parse(JSON.stringify(s.overlay)),
    canvasNodes: new Map(
      Array.from(s.canvasNodes.entries()).map(([k, v]) => [k, { ...v }])
    ),
    canvasEdges: new Map(
      Array.from(s.canvasEdges.entries()).map(([k, v]) => [
        k,
        { ...v, waypoints: v.waypoints.map((wp) => ({ ...wp })) },
      ])
    ),
  };
}

// Singleton instance
export const historyManager = new HistoryManager();
