/**
 * Central Zustand store for the diagram state.
 * Manages: mermaid code, parsed graph, overlay, canvas nodes/edges, staging, sync state.
 */
import { create } from "zustand";
import type { MermaidGraph } from "@/lib/mermaid/types";
import type { DiagramOverlay } from "@/lib/overlay/types";
import { createEmptyOverlay } from "@/lib/overlay/types";
import type { StagedNode } from "@/lib/overlay/staging";
import type { CanvasNodeState, CanvasEdgeState } from "@/shapes/shape-types";

const DEFAULT_MERMAID = `graph TD
    A[User Request] --> B{Auth Check}
    B -->|Authenticated| C[Process Request]
    B -->|Denied| D[Login Page]
    C --> E[(Database)]
    C --> F[Cache]
    F --> G[Response]
    E --> G`;

export type SyncStatus = "idle" | "parsing" | "syncing" | "error";

interface DiagramState {
  // Mermaid code
  code: string;
  setCode: (code: string) => void;

  // Parsed graph (result of mermaid parsing)
  parsedGraph: MermaidGraph | null;
  setParsedGraph: (graph: MermaidGraph | null) => void;

  // Parse error
  parseError: string | null;
  setParseError: (error: string | null) => void;

  // Overlay (user positions/styles)
  overlay: DiagramOverlay;
  setOverlay: (overlay: DiagramOverlay) => void;
  updateOverlay: (updater: (prev: DiagramOverlay) => DiagramOverlay) => void;

  // Canvas nodes (Konva rendering source of truth)
  canvasNodes: Map<string, CanvasNodeState>;
  upsertCanvasNode: (node: CanvasNodeState) => void;
  upsertCanvasNodes: (nodes: CanvasNodeState[]) => void;
  removeCanvasNodes: (ids: string[]) => void;
  clearCanvasNodes: () => void;

  // Canvas edges
  canvasEdges: Map<string, CanvasEdgeState>;
  upsertCanvasEdge: (edge: CanvasEdgeState) => void;
  upsertCanvasEdges: (edges: CanvasEdgeState[]) => void;
  removeCanvasEdges: (ids: string[]) => void;
  clearCanvasEdges: () => void;

  // Selection
  selectedNodeIds: Set<string>;
  setSelectedNodeIds: (ids: Set<string>) => void;
  selectNode: (id: string) => void;
  deselectAll: () => void;

  // Staging area
  stagedNodes: StagedNode[];
  setStagedNodes: (nodes: StagedNode[]) => void;
  removeStagedNode: (nodeId: string) => void;
  clearStagedNodes: () => void;

  // Sync status
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;

  // Flag to prevent sync loops
  isSyncingToOverlay: boolean;
  setIsSyncingToOverlay: (syncing: boolean) => void;
}

export const useDiagramStore = create<DiagramState>((set) => ({
  code: DEFAULT_MERMAID,
  setCode: (code) => set({ code }),

  parsedGraph: null,
  setParsedGraph: (parsedGraph) => set({ parsedGraph }),

  parseError: null,
  setParseError: (parseError) => set({ parseError }),

  overlay: createEmptyOverlay(),
  setOverlay: (overlay) => set({ overlay }),
  updateOverlay: (updater) =>
    set((state) => ({ overlay: updater(state.overlay) })),

  // Canvas nodes
  canvasNodes: new Map(),
  upsertCanvasNode: (node) =>
    set((state) => {
      const next = new Map(state.canvasNodes);
      next.set(node.id, node);
      return { canvasNodes: next };
    }),
  upsertCanvasNodes: (nodes) =>
    set((state) => {
      const next = new Map(state.canvasNodes);
      for (const n of nodes) next.set(n.id, n);
      return { canvasNodes: next };
    }),
  removeCanvasNodes: (ids) =>
    set((state) => {
      const next = new Map(state.canvasNodes);
      for (const id of ids) next.delete(id);
      // Also deselect removed nodes
      const sel = new Set(state.selectedNodeIds);
      for (const id of ids) sel.delete(id);
      return { canvasNodes: next, selectedNodeIds: sel };
    }),
  clearCanvasNodes: () => set({ canvasNodes: new Map() }),

  // Canvas edges
  canvasEdges: new Map(),
  upsertCanvasEdge: (edge) =>
    set((state) => {
      const next = new Map(state.canvasEdges);
      next.set(edge.id, edge);
      return { canvasEdges: next };
    }),
  upsertCanvasEdges: (edges) =>
    set((state) => {
      const next = new Map(state.canvasEdges);
      for (const e of edges) next.set(e.id, e);
      return { canvasEdges: next };
    }),
  removeCanvasEdges: (ids) =>
    set((state) => {
      const next = new Map(state.canvasEdges);
      for (const id of ids) next.delete(id);
      return { canvasEdges: next };
    }),
  clearCanvasEdges: () => set({ canvasEdges: new Map() }),

  // Selection
  selectedNodeIds: new Set(),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
  selectNode: (id) => set({ selectedNodeIds: new Set([id]) }),
  deselectAll: () => set({ selectedNodeIds: new Set() }),

  // Staging
  stagedNodes: [],
  setStagedNodes: (stagedNodes) => set({ stagedNodes }),
  removeStagedNode: (nodeId) =>
    set((state) => ({
      stagedNodes: state.stagedNodes.filter((n) => n.id !== nodeId),
    })),
  clearStagedNodes: () => set({ stagedNodes: [] }),

  syncStatus: "idle",
  setSyncStatus: (syncStatus) => set({ syncStatus }),

  isSyncingToOverlay: false,
  setIsSyncingToOverlay: (isSyncingToOverlay) => set({ isSyncingToOverlay }),
}));
