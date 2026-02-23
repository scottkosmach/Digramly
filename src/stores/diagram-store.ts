/**
 * Central Zustand store for the diagram state.
 * Manages: mermaid code, parsed graph, overlay, staging, sync state.
 */
import { create } from "zustand";
import type { MermaidGraph } from "@/lib/mermaid/types";
import type { DiagramOverlay } from "@/lib/overlay/types";
import { createEmptyOverlay } from "@/lib/overlay/types";
import type { StagedNode } from "@/lib/overlay/staging";

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

  // Staging area
  stagedNodes: StagedNode[];
  setStagedNodes: (nodes: StagedNode[]) => void;
  removeStagedNode: (nodeId: string) => void;
  clearStagedNodes: () => void;

  // Sync status
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;

  // Flag to prevent sync loops: true when canvas→overlay update is in progress
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
