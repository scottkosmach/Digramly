import { T, Circle2d } from "tldraw";
import type { DiagramCircleShape } from "./diagram-shapes";
import { BaseDiagramShapeUtil } from "./BaseDiagramShapeUtil";
import { SHAPE_DEFAULTS, SHAPE_COLOR_NAMES, DEFAULT_SHAPE_COLOR } from "./shared/shape-styles";

export class CircleShapeUtil extends BaseDiagramShapeUtil<DiagramCircleShape> {
  static override type = "diagram-circle" as const;

  static override props = {
    w: T.number,
    h: T.number,
    label: T.string,
    color: T.literalEnum(...SHAPE_COLOR_NAMES),
    nodeId: T.string,
  };

  override getDefaultProps(): DiagramCircleShape["props"] {
    return {
      w: 90,
      h: 90,
      label: "Event",
      color: DEFAULT_SHAPE_COLOR,
      nodeId: "",
    };
  }

  override getGeometry(shape: DiagramCircleShape) {
    const r = Math.min(shape.props.w, shape.props.h) / 2;
    return new Circle2d({
      x: shape.props.w / 2 - r,
      y: shape.props.h / 2 - r,
      radius: r,
      isFilled: true,
    });
  }

  renderShape(
    shape: DiagramCircleShape,
    colors: { fill: string; stroke: string }
  ) {
    const { w, h } = shape.props;
    return (
      <ellipse
        cx={w / 2}
        cy={h / 2}
        rx={w / 2 - 1}
        ry={h / 2 - 1}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={SHAPE_DEFAULTS.strokeWidth}
      />
    );
  }

  override indicator(shape: DiagramCircleShape) {
    const { w, h } = shape.props;
    return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} />;
  }
}
