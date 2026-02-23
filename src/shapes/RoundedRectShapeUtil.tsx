import { T } from "tldraw";
import type { DiagramRoundedRectShape } from "./diagram-shapes";
import { BaseDiagramShapeUtil } from "./BaseDiagramShapeUtil";
import { SHAPE_DEFAULTS, SHAPE_COLOR_NAMES, DEFAULT_SHAPE_COLOR } from "./shared/shape-styles";

export class RoundedRectShapeUtil extends BaseDiagramShapeUtil<DiagramRoundedRectShape> {
  static override type = "diagram-rounded-rect" as const;

  static override props = {
    w: T.number,
    h: T.number,
    label: T.string,
    color: T.literalEnum(...SHAPE_COLOR_NAMES),
    nodeId: T.string,
  };

  override getDefaultProps(): DiagramRoundedRectShape["props"] {
    return {
      w: SHAPE_DEFAULTS.w,
      h: SHAPE_DEFAULTS.h,
      label: "Action",
      color: DEFAULT_SHAPE_COLOR,
      nodeId: "",
    };
  }

  renderShape(
    shape: DiagramRoundedRectShape,
    colors: { fill: string; stroke: string }
  ) {
    return (
      <rect
        x={1}
        y={1}
        width={shape.props.w - 2}
        height={shape.props.h - 2}
        rx={16}
        ry={16}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={SHAPE_DEFAULTS.strokeWidth}
      />
    );
  }

  override indicator(shape: DiagramRoundedRectShape) {
    return (
      <rect
        x={0}
        y={0}
        width={shape.props.w}
        height={shape.props.h}
        rx={16}
        ry={16}
      />
    );
  }
}
