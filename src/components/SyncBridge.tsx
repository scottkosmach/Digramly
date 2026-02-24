"use client";

import { useMermaidParser } from "@/hooks/useMermaidParser";
import { useDiagramSync } from "@/hooks/useDiagramSync";
import { StagingArea } from "./StagingArea";

/**
 * Bridge component that activates the parser and sync hooks.
 * Lives outside the Konva Stage — no canvas context needed.
 */
export function SyncBridge() {
  useMermaidParser();
  const { placeStagedNode, placeAllStagedNodes } = useDiagramSync();

  return (
    <StagingArea
      onPlaceNode={placeStagedNode}
      onPlaceAll={placeAllStagedNodes}
    />
  );
}
