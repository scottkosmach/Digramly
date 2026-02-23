/**
 * Debounced Mermaid parsing hook.
 * Watches code changes, parses with 300ms debounce, updates store.
 */
import { useEffect, useRef } from "react";
import { useDiagramStore } from "@/stores/diagram-store";
import { parseMermaid } from "@/lib/mermaid/parser";

export function useMermaidParser() {
  const code = useDiagramStore((s) => s.code);
  const setParsedGraph = useDiagramStore((s) => s.setParsedGraph);
  const setParseError = useDiagramStore((s) => s.setParseError);
  const setSyncStatus = useDiagramStore((s) => s.setSyncStatus);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setSyncStatus("parsing");

    timerRef.current = setTimeout(async () => {
      const trimmed = code.trim();
      if (!trimmed) {
        setParsedGraph(null);
        setParseError(null);
        setSyncStatus("idle");
        return;
      }

      const graph = await parseMermaid(trimmed);
      if (graph) {
        setParsedGraph(graph);
        setParseError(null);
      } else {
        setParseError("Invalid Mermaid syntax");
        // Keep the previous parsed graph so the canvas doesn't blank out
      }
      setSyncStatus("idle");
    }, 300);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [code, setParsedGraph, setParseError, setSyncStatus]);
}
