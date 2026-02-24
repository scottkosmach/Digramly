/**
 * Patches a node's label directly in Mermaid source code.
 * Keeps the Mermaid code as single source of truth for labels.
 */

/** Bracket pair definition: open/close strings and a regex-safe version */
interface BracketPair {
  open: string;
  close: string;
  openRe: string;
  closeRe: string;
}

/**
 * Ordered from most-specific (double brackets) to least-specific (single brackets)
 * so the first match wins without ambiguity.
 */
const BRACKET_PAIRS: BracketPair[] = [
  { open: "([", close: "])", openRe: "\\(\\[", closeRe: "\\]\\)" }, // stadium
  { open: "[(", close: ")]", openRe: "\\[\\(", closeRe: "\\)\\]" }, // cylinder
  { open: "((", close: "))", openRe: "\\(\\(", closeRe: "\\)\\)" }, // circle
  { open: "{",  close: "}",  openRe: "\\{",    closeRe: "\\}"    }, // diamond
  { open: ">",  close: "]",  openRe: ">",      closeRe: "\\]"    }, // asymmetric
  { open: "(",  close: ")",  openRe: "\\(",     closeRe: "\\)"    }, // round
  { open: "[",  close: "]",  openRe: "\\[",     closeRe: "\\]"    }, // box
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace a node's label in raw Mermaid flowchart code.
 *
 * @returns The patched code string, or the original code unchanged if no match found.
 */
export function patchNodeLabel(
  code: string,
  nodeId: string,
  newLabel: string
): string {
  const escapedId = escapeRegExp(nodeId);

  for (const bp of BRACKET_PAIRS) {
    // Match: nodeId + opening brackets + label content + closing brackets
    // The nodeId must be preceded by a word boundary or start-of-line context
    // (we use a lookbehind for non-word-char or start-of-string)
    const pattern = new RegExp(
      `((?:^|[^\\w])${escapedId})` + // group 1: preceding context + nodeId
      `(${bp.openRe})` +             // group 2: opening bracket(s)
      `([\\s\\S]*?)` +               // group 3: label content (lazy)
      `(${bp.closeRe})`,             // group 4: closing bracket(s)
      "m"
    );

    const match = pattern.exec(code);
    if (match) {
      const replaced =
        code.slice(0, match.index) +
        match[1] + match[2] + newLabel + match[4] +
        code.slice(match.index + match[0].length);
      return replaced;
    }
  }

  // No match found — return code unchanged (safe fallback)
  return code;
}

/**
 * Remove an edge line from Mermaid flowchart code.
 * Matches patterns like:
 *   sourceId --> targetId
 *   sourceId -->|label| targetId
 *   sourceId --- targetId
 *   sourceId -.-> targetId
 *   etc.
 *
 * @returns The patched code string with the edge line removed.
 */
export function removeEdgeFromCode(
  code: string,
  sourceId: string,
  targetId: string
): string {
  const src = escapeRegExp(sourceId);
  const tgt = escapeRegExp(targetId);

  // Match a full line containing sourceId <arrow> targetId
  // Arrow patterns: -->, --->, -.->. -..-, ===, ==>, with optional |label|
  const pattern = new RegExp(
    `^[ \\t]*${src}\\s+` +       // sourceId + whitespace
    `[-=.]+[>|]*` +              // arrow chars (-->, -.->. ===>, etc.)
    `(?:\\|[^|]*\\|)?` +         // optional |label|
    `[-=.>]*` +                  // rest of arrow
    `\\s+${tgt}` +               // whitespace + targetId
    `[ \\t]*(?:;.*)?$`,          // optional trailing semicolon/comment
    "m"
  );

  const match = pattern.exec(code);
  if (match) {
    // Remove the matched line (and its trailing newline if present)
    const before = code.slice(0, match.index);
    let after = code.slice(match.index + match[0].length);
    if (after.startsWith("\n")) after = after.slice(1);
    else if (after.startsWith("\r\n")) after = after.slice(2);
    return before + after;
  }

  return code;
}

/**
 * Add an edge line to Mermaid flowchart code.
 * Appends `    sourceId --> targetId` (with optional label) after the last
 * node/edge line in the graph block.
 *
 * @returns The patched code string with the new edge line.
 */
export function addEdgeToCode(
  code: string,
  sourceId: string,
  targetId: string,
  label?: string
): string {
  const edgeLine = label
    ? `    ${sourceId} -->|${label}| ${targetId}`
    : `    ${sourceId} --> ${targetId}`;

  // Find the last non-empty, non-comment line that looks like graph content
  // (i.e., contains a node ID or arrow). Insert after it.
  const lines = code.split("\n");
  let insertIndex = lines.length;

  // Walk backwards to find last content line in the graph block
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === "" || trimmed.startsWith("%%")) continue;
    // Found a content line — insert after it
    insertIndex = i + 1;
    break;
  }

  lines.splice(insertIndex, 0, edgeLine);
  return lines.join("\n");
}
