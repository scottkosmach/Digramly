// Shared style constants for diagram shapes

export const SHAPE_COLORS = {
  blue: { fill: "#dbeafe", stroke: "#2563eb", text: "#1e40af" },
  green: { fill: "#dcfce7", stroke: "#16a34a", text: "#166534" },
  red: { fill: "#fecaca", stroke: "#dc2626", text: "#991b1b" },
  yellow: { fill: "#fef9c3", stroke: "#ca8a04", text: "#854d0e" },
  purple: { fill: "#f3e8ff", stroke: "#9333ea", text: "#6b21a8" },
  orange: { fill: "#ffedd5", stroke: "#ea580c", text: "#9a3412" },
  gray: { fill: "#f3f4f6", stroke: "#6b7280", text: "#374151" },
  white: { fill: "#ffffff", stroke: "#374151", text: "#111827" },
} as const;

export type ShapeColor = keyof typeof SHAPE_COLORS;
export const SHAPE_COLOR_NAMES = Object.keys(SHAPE_COLORS) as ShapeColor[];

export const DEFAULT_SHAPE_COLOR: ShapeColor = "blue";

export const FONT = {
  family: "Inter, system-ui, -apple-system, sans-serif",
  size: 14,
  lineHeight: 1.4,
};

export const SHAPE_DEFAULTS = {
  w: 160,
  h: 70,
  minW: 60,
  minH: 40,
  padding: 12,
  borderRadius: 8,
  strokeWidth: 2,
};

export const PORT_SIZE = 8;
export const PORT_HIT_AREA = 16;
