"use client";

import { useDiagramStore } from "@/stores/diagram-store";

export function CodePanel() {
  const code = useDiagramStore((s) => s.code);
  const setCode = useDiagramStore((s) => s.setCode);
  const parseError = useDiagramStore((s) => s.parseError);
  const syncStatus = useDiagramStore((s) => s.syncStatus);

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--panel-bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span className="text-sm font-medium">Mermaid</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-400">
            {code.split("\n").length} lines
          </span>
        </div>
      </div>

      {/* Editor area — placeholder until CodeMirror is integrated in Phase 4 */}
      <div className="flex-1 overflow-hidden">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-full w-full resize-none border-0 p-4 font-mono text-sm leading-relaxed outline-none"
          style={{
            background: "var(--panel-bg)",
            color: "var(--foreground)",
            tabSize: 4,
          }}
          spellCheck={false}
          placeholder="Enter Mermaid diagram code..."
        />
      </div>

      {/* Status bar */}
      <div
        className="flex items-center justify-between px-4 py-1.5 text-xs text-zinc-400"
        style={{ borderTop: "1px solid var(--border-color)" }}
      >
        <span>Flowchart</span>
        <span className="flex items-center gap-1">
          {syncStatus === "parsing" && (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-400" />
              Parsing...
            </>
          )}
          {syncStatus === "syncing" && (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
              Syncing...
            </>
          )}
          {syncStatus === "idle" && !parseError && (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
              Valid
            </>
          )}
          {syncStatus === "idle" && parseError && (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
              Error
            </>
          )}
        </span>
      </div>
    </div>
  );
}
