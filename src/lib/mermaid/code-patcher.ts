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
