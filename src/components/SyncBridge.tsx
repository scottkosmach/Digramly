"use client";

import { useMermaidParser } from "@/hooks/useMermaidParser";
import { useDiagramSync } from "@/hooks/useDiagramSync";
import { StagingArea } from "./StagingArea";

/**
 * Bridge component that lives inside the Tldraw context.
 * Activates the parser and sync hooks, renders the staging area.
 */
export function SyncBridge() {
  // Parse mermaid code on changes
  useMermaidParser();

  // Sync parsed graph ↔ canvas ↔ overlay
  const { placeStagedNode, placeAllStagedNodes } = useDiagramSync();

  return (
    <StagingArea
      onPlaceNode={placeStagedNode}
      onPlaceAll={placeAllStagedNodes}
    />
  );
}
