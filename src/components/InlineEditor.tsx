"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type Konva from "konva";
import { useDiagramStore } from "@/stores/diagram-store";
import { FONT } from "@/shapes/shared/shape-styles";
import { patchNodeLabel } from "@/lib/mermaid/code-patcher";

interface InlineEditorProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

/**
 * HTML textarea overlay positioned via Konva stage coordinates.
 * Appears on double-click a shape, saves on Enter/blur, cancels on Escape.
 */
export function InlineEditor({ stageRef }: InlineEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canvasNodes = useDiagramStore((s) => s.canvasNodes);
  const upsertCanvasNode = useDiagramStore((s) => s.upsertCanvasNode);

  // Expose startEditing on the window so CanvasPanel can call it
  const startEditing = useCallback(
    (nodeId: string) => {
      const node = useDiagramStore.getState().canvasNodes.get(nodeId);
      const stage = stageRef.current;
      if (!node || !stage) return;

      // Convert canvas coordinates to screen coordinates
      const scale = stage.scaleX();
      const stagePos = stage.position();
      const containerRect = stage.container().getBoundingClientRect();

      const screenX = node.x * scale + stagePos.x + containerRect.left;
      const screenY = node.y * scale + stagePos.y + containerRect.top;
      const screenW = node.w * scale;
      const screenH = node.h * scale;

      setEditingId(nodeId);
      setText(node.label);
      setPos({
        x: screenX - containerRect.left,
        y: screenY - containerRect.top,
        w: screenW,
        h: screenH,
      });
    },
    [stageRef]
  );

  // Make startEditing accessible
  useEffect(() => {
    (window as any).__inlineEditorStart = startEditing;
    return () => {
      delete (window as any).__inlineEditorStart;
    };
  }, [startEditing]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingId]);

  const commit = useCallback(() => {
    if (!editingId) return;
    const node = useDiagramStore.getState().canvasNodes.get(editingId);
    if (node && text !== node.label) {
      upsertCanvasNode({ ...node, label: text });
      // Patch the Mermaid source code so it stays in sync
      const { code, setCode } = useDiagramStore.getState();
      const patched = patchNodeLabel(code, node.nodeId, text);
      if (patched !== code) {
        setCode(patched);
      }
    }
    setEditingId(null);
  }, [editingId, text, upsertCanvasNode]);

  const cancel = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commit();
      }
      if (e.key === "Escape") {
        cancel();
      }
    },
    [commit, cancel]
  );

  if (!editingId) return null;

  return (
    <textarea
      ref={textareaRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: pos.w,
        height: pos.h,
        fontSize: FONT.size,
        fontFamily: FONT.family,
        textAlign: "center",
        border: "2px solid #2563eb",
        borderRadius: 4,
        background: "white",
        outline: "none",
        resize: "none",
        zIndex: 1000,
        padding: "8px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
      }}
    />
  );
}
