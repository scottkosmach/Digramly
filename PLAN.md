# Diagramly — Project Plan & Status

## Vision

A custom diagram tool that combines **code-based diagram creation** (like Mermaid.live) and **manual visual editing** (like diagrams.net). The core architecture is a **two-layer model**: Mermaid code owns structure (what LLMs read/write), while a JSON overlay owns positioning/styling (what the user controls visually). This means an LLM can safely modify a diagram without destroying manual layout work.

- **Hosted on**: Vercel (Next.js) + Supabase (auth + persistence)
- **UX is priority #1**: "I don't care how hard it is to build, I care about how easy and intuitively ease the UX is"
- **Repo**: `C:\Users\scott\Desktop\HTML - 1 offs\Diagrams` (branch: `main`)

---

## Technology Stack

| Category | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** + React 19 + TypeScript | App router, server components, Vercel-native |
| Canvas | **tldraw SDK v4.4.0** | Best connection UX, grouping, touch support. Built by Figma alums |
| Diagram DSL | **Mermaid** | Widest LLM training exposure (ubiquitous in GitHub/Markdown) |
| Auto-layout | **ELK.js** | Best layout algorithms (layered, orthogonal). Outputs x/y + edge bends |
| Code editor | **CodeMirror 6** | Lightweight, extensible, has mermaid language package |
| State mgmt | **Zustand v5** | Lightweight, works alongside tldraw's own store |
| Panels | **react-resizable-panels v4** | Split-pane layout |
| Styling | **Tailwind CSS v4** | Fast iteration on UI |

---

## What's Built (Phases 1-3)

### Phase 1: Scaffolding + Split-Pane Layout ✅

Working Next.js app with tldraw canvas in a resizable split-pane layout.

**Files created:**
```
src/app/layout.tsx              — Root layout with "Diagramly" title, Geist fonts
src/app/page.tsx                — Server component rendering <DiagramEditor />
src/app/globals.css             — Tailwind + tldraw CSS + panel + dark mode styles
src/components/DiagramEditor.tsx — Split-pane: 35% CodePanel | 65% CanvasPanel
src/components/CanvasPanel.tsx   — tldraw with custom shapes, dynamic import (ssr: false)
src/components/CodePanel.tsx     — Textarea with default Mermaid code (placeholder for CodeMirror)
.claude/launch.json             — Dev server config (port 3000)
CLAUDE.md                       — Chrome MCP testing workflow instructions
```

### Phase 2: Custom Shape System ✅ (build passing, needs visual QA)

6 diagram node shapes + 1 custom connector with waypoint/bezier support.

**Files created:**
```
src/shapes/diagram-shapes.ts           — Type defs + TLGlobalShapePropsMap module augmentation
src/shapes/shared/shape-styles.ts      — 8 colors (fill/stroke/text), font config, dimension defaults
src/shapes/shared/ports.ts             — Cardinal port definitions (top/right/bottom/left)
src/shapes/BaseDiagramShapeUtil.tsx     — Abstract base class (geometry, resize, label editing)
src/shapes/BoxShapeUtil.tsx             — Rectangle (process node)
src/shapes/DiamondShapeUtil.tsx         — Diamond (decision node, Polygon2d geometry)
src/shapes/CylinderShapeUtil.tsx        — Database cylinder (ellipse top/bottom)
src/shapes/CircleShapeUtil.tsx          — Circle (event node, Circle2d geometry)
src/shapes/RoundedRectShapeUtil.tsx     — Rounded rectangle (rx=16)
src/shapes/StadiumShapeUtil.tsx         — Stadium/pill shape (rx=h/2)
src/connectors/ConnectorShapeUtil.tsx   — Custom connector with waypoint handles + 3 curve types
src/connectors/connector-rendering.ts  — SVG path generation (straight/bezier/orthogonal) + arrowheads
src/tools/DiagramShapeTool.ts          — StateNode tool for placing shapes on click
src/lib/shape-registry.ts              — Central registry (7 shapeUtils + 1 tool)
src/ui/ShapePalette.tsx                — Floating toolbar with 6 shape buttons + SVG icons
```

**Architecture highlights:**
- All shapes extend `BaseDiagramShapeUtil` which extends `ShapeUtil` (not `BaseBoxShapeUtil` — see lessons learned)
- Each node carries a `nodeId` prop linking to Mermaid node ID (key for two-layer model)
- Connector supports `waypoints[]` array with draggable handles at each vertex
- Midpoint "create" handles let users add new waypoints by dragging between existing ones
- Module augmentation via `declare module "@tldraw/tlschema"` registers all 7 custom shape types

---

## Lessons Learned (tldraw v4 + React 19)

These are hard-won discoveries from Phase 1-2 that will save significant time going forward:

| Issue | Root Cause | Fix |
|---|---|---|
| `create-next-app` rejects capital letters | npm package names must be lowercase | Create in temp dir with lowercase name, copy files |
| `PanelGroup`/`PanelResizeHandle` not found | react-resizable-panels v4 renamed exports | Use `Group`, `Panel`, `Separator` |
| `direction` prop doesn't exist | v4 API change | Use `orientation="horizontal"` |
| `defaultSize={35}` shows as 35px | v4 interprets numbers as pixels | Use string `"35%"` format |
| `TLOnEditEndHandler` not exported | tldraw v4 removed this type | Use plain `override onEditEnd()` method |
| Can't extend `BaseBoxShapeUtil` | Generic constraint requires `TLBaseBoxShape` (closed union) | Extend `ShapeUtil` directly, provide Rectangle2d geometry manually |
| `ConnectorShape` doesn't satisfy `TLShape` | tldraw builds `TLShape` from `TLGlobalShapePropsMap` | Add `declare module "@tldraw/tlschema"` module augmentation |
| `resizeBox` return type mismatch | Returns full shape, `onResize` expects partial | Cast with `as any` |
| `JSX.Element` not found | React 19 removed JSX namespace | Import React, use `React.ReactElement` |
| `Polygon2d` rejects `{x, y}` | Expects `Vec` instances | Use `new Vec(x, y)` |
| `getGeometry` return type mismatch | Base expects `Rectangle2d`, subclass returns `Circle2d` | Return type `: any` on base class |
| Mermaid v11 has no `flowDb` export | API restructured — internal DB accessed via Diagram object | `mermaidAPI.getDiagramFromText(code)` → `diagram.db` cast to `any` |
| `suppressErrors` rejected by mermaid config | Not a valid `MermaidConfig` property in v11 | Use `{ startOnLoad: false }` only |
| ELK result missing `width`/`height` types | elkjs types don't declare these on root result | Cast `result as any` for `.width`/`.height` |
| tldraw `persistenceKey` conflicts with sync | Shapes created by sync engine get duplicated with local persistence | Remove `persistenceKey` when using programmatic sync |

---

## What's Next

### Phase 3: Two-Layer Model (Mermaid + JSON Overlay) ✅

Core sync engine built: Mermaid parsing → ELK layout → overlay merge → tldraw canvas, with bidirectional sync.

**Files created:**
```
src/lib/mermaid/types.ts        — MermaidNode, MermaidEdge, MermaidSubGraph, shape mapping
src/lib/mermaid/parser.ts       — Parse mermaid → {vertices, edges, subgraphs} via mermaid v11 FlowDB
src/lib/layout/types.ts         — LayoutResult, LayoutNode, LayoutEdge
src/lib/layout/elk-layout.ts    — ELK.js layout service (layered algorithm, orthogonal routing)
src/lib/overlay/types.ts        — DiagramOverlay, NodeOverlay, EdgeOverlay
src/lib/overlay/merge.ts        — Merge parsedMermaid + overlay + layout → canvas state
src/lib/overlay/diff.ts         — Diff canvas changes → overlay updates
src/lib/overlay/staging.ts      — Staging area logic for unpositioned nodes
src/stores/diagram-store.ts     — Zustand store: code, parsedGraph, overlay, staging, syncStatus
src/hooks/useMermaidParser.ts   — Debounced (300ms) parsing hook
src/hooks/useDiagramSync.ts     — Bidirectional sync orchestrator (code→canvas + canvas→overlay)
src/components/SyncBridge.tsx    — Bridge component inside tldraw context (activates hooks)
src/components/StagingArea.tsx   — Collapsible panel for unpositioned nodes with "Place All"
```

**Architecture highlights:**
- Mermaid parser uses `mermaidAPI.getDiagramFromText()` → `db.getVertices()`/`getEdges()`/`getSubGraphs()`
- ELK.js runs layered layout with direction-aware spacing
- Merge rules: overlay position → use it; no overlay + layout → auto-place; no layout → staging area
- Canvas→overlay sync listens to tldraw store with `{ source: "user", scope: "document" }` filter
- Code→canvas sync debounces 300ms, uses isSyncingRef to prevent loops
- CodePanel now reads/writes Zustand store instead of local useState
- Removed `persistenceKey` from tldraw (sync engine owns state now)

---

### Phase 4: Code Editor (CodeMirror 6) — UP NEXT

Replace textarea with CodeMirror 6 + mermaid syntax highlighting + live error squiggles.

**Install**: `npm install @codemirror/view @codemirror/state @codemirror/commands @codemirror/language codemirror-lang-mermaid`

**Files:**
```
src/components/CodePanel.tsx      — Updated: CodeMirror + status bar
src/components/MermaidEditor.tsx  — CodeMirror 6 wrapper
src/hooks/useCodeMirror.ts        — CodeMirror lifecycle hook
src/lib/codemirror/mermaid-lint.ts — Lint extension using mermaid parser
src/lib/codemirror/extensions.ts  — Bundled extensions
```

---

### Phase 5: Canvas UX Polish

Snap-to-grid, alignment guides, bezier control points, keyboard shortcuts, right-click context menu.

**Steps:**
1. Grid snapping via `editor.updateInstanceState({ isGridMode: true })`
2. Port-aware snapping with `getHandleSnapGeometry()` on all shapes
3. Connection drawing UX — hover-port highlighting, live preview line, drop-to-connect
4. Bezier control point handles on connectors
5. Keyboard shortcuts (toggle curve type, delete, duplicate, etc.)
6. Right-click context menu (change shape type, edit label, change color)

**Files:**
```
src/lib/snapping/grid-config.ts
src/lib/snapping/alignment-guides.ts
src/connectors/bezier-handles.ts
src/components/ContextMenu.tsx
src/lib/keyboard/shortcuts.ts
```

---

### Phase 6: Persistence + Auth (Supabase)

**Install**: `npm install @supabase/supabase-js @supabase/ssr`

**Database schema:**
```sql
CREATE TABLE diagrams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Diagram',
  mermaid_code TEXT NOT NULL DEFAULT '',
  overlay JSONB NOT NULL DEFAULT '{"version":1,"nodes":{},"edges":{}}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- + RLS policies for user_id = auth.uid()
```

**Files:**
```
src/lib/supabase/client.ts       — Browser client
src/lib/supabase/server.ts       — Server client
src/app/auth/login/page.tsx
src/app/auth/signup/page.tsx
src/app/auth/callback/route.ts
src/app/dashboard/page.tsx       — Diagram list
src/app/api/diagrams/route.ts    — GET (list), POST (create)
src/app/api/diagrams/[id]/route.ts — GET, PUT, DELETE
src/hooks/useAutoSave.ts         — Debounced 2s save
src/hooks/useDiagram.ts          — Load/save from Supabase
src/middleware.ts                 — Auth middleware
```

---

### Phase 7: LLM Integration

**Install**: `npm install ai` (Vercel AI SDK)

Generate diagrams from natural language. Edit existing diagrams preserving node IDs.

**Key prompt rule**: LLM must PRESERVE existing node IDs so overlay positions survive edits. New nodes get new IDs and land in staging area.

**Files:**
```
src/app/api/generate/route.ts    — Natural language → Mermaid
src/app/api/edit/route.ts        — Existing Mermaid + instruction → modified Mermaid
src/lib/llm/client.ts
src/lib/llm/prompts.ts           — System prompts enforcing node ID preservation
src/components/GeneratePanel.tsx
src/components/EditAssistant.tsx
src/components/PromptInput.tsx
```

---

### Phase 8: Export

SVG, PNG, and Mermaid code export via `editor.getSvgElement()` + canvas rendering.

**Files:**
```
src/lib/export/svg-export.ts
src/lib/export/png-export.ts
src/lib/export/mermaid-export.ts
src/components/ExportMenu.tsx
```

---

## Phase Dependency Graph

```
Phase 1 (Scaffold) ✅
  └→ Phase 2 (Shapes) ✅
       └→ Phase 3 (Two-Layer Model) ✅
            ├→ Phase 4 (Code Editor)  ──┐
            ├→ Phase 5 (UX Polish)     ├─ can be parallel ← NEXT
            └→ Phase 6 (Persistence)  ──┘
                 └→ Phase 7 (LLM)
                      └→ Phase 8 (Export)
```

---

## Verification Plan

| Phase | How to Test |
|---|---|
| 1 ✅ | App loads, tldraw renders, split pane resizes |
| 2 ✅ | Place each shape type, shape palette works, build passes |
| 3 | Type Mermaid → shapes appear. Move shapes → overlay updates. New nodes → staging area |
| 4 | CodeMirror renders with syntax highlighting. Invalid Mermaid shows error squiggles |
| 5 | Grid snapping works. Bezier handles draggable. Keyboard shortcuts work |
| 6 | Sign up, log in. Diagrams save/load. Auto-save. Dashboard lists diagrams |
| 7 | "Draw a user auth flow" → diagram. "Add rate limiter" → old positions preserved |
| 8 | SVG/PNG downloads look correct. Mermaid copies to clipboard |

**E2E smoke test**: Create diagram via LLM → manually reposition → LLM adds nodes → old positions preserved, new nodes in staging → place them → export PNG.

---

## Current File Tree

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── CanvasPanel.tsx
│   ├── CodePanel.tsx
│   ├── DiagramEditor.tsx
│   ├── StagingArea.tsx          ← Phase 3
│   └── SyncBridge.tsx           ← Phase 3
├── connectors/
│   ├── ConnectorShapeUtil.tsx
│   └── connector-rendering.ts
├── hooks/
│   ├── useDiagramSync.ts       ← Phase 3
│   └── useMermaidParser.ts     ← Phase 3
├── lib/
│   ├── layout/
│   │   ├── elk-layout.ts       ← Phase 3
│   │   └── types.ts            ← Phase 3
│   ├── mermaid/
│   │   ├── parser.ts           ← Phase 3
│   │   └── types.ts            ← Phase 3
│   ├── overlay/
│   │   ├── diff.ts             ← Phase 3
│   │   ├── merge.ts            ← Phase 3
│   │   ├── staging.ts          ← Phase 3
│   │   └── types.ts            ← Phase 3
│   └── shape-registry.ts
├── shapes/
│   ├── BaseDiagramShapeUtil.tsx
│   ├── BoxShapeUtil.tsx
│   ├── CircleShapeUtil.tsx
│   ├── CylinderShapeUtil.tsx
│   ├── DiamondShapeUtil.tsx
│   ├── RoundedRectShapeUtil.tsx
│   ├── StadiumShapeUtil.tsx
│   ├── diagram-shapes.ts
│   └── shared/
│       ├── ports.ts
│       └── shape-styles.ts
├── stores/
│   └── diagram-store.ts        ← Phase 3
├── tools/
│   └── DiagramShapeTool.ts
└── ui/
    └── ShapePalette.tsx
```
