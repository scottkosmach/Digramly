import { T } from "tldraw";
import type { DiagramBoxShape } from "./diagram-shapes";
import { BaseDiagramShapeUtil } from "./BaseDiagramShapeUtil";
import { SHAPE_DEFAULTS, SHAPE_COLOR_NAMES, DEFAULT_SHAPE_COLOR } from "./shared/shape-styles";

export class BoxShapeUtil extends BaseDiagramShapeUtil<DiagramBoxShape> {
  static override type = "diagram-box" as const;

  static override props = {
    w: T.number,
    h: T.number,
    label: T.string,
    color: T.literalEnum(...SHAPE_COLOR_NAMES),
    nodeId: T.string,
  };

  override getDefaultProps(): DiagramBoxShape["props"] {
    return {
      w: SHAPE_DEFAULTS.w,
      h: SHAPE_DEFAULTS.h,
      label: "Process",
      color: DEFAULT_SHAPE_COLOR,
      nodeId: "",
    };
  }

  renderShape(
    shape: DiagramBoxShape,
    colors: { fill: string; stroke: string }
  ) {
    return (
      <rect
        x={1}
        y={1}
        width={shape.props.w - 2}
        height={shape.props.h - 2}
        rx={4}
        ry={4}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={SHAPE_DEFAULTS.strokeWidth}
      />
    );
  }

  override indicator(shape: DiagramBoxShape) {
    return (
      <rect
        x={0}
        y={0}
        width={shape.props.w}
        height={shape.props.h}
        rx={4}
        ry={4}
      />
    );
  }
}
