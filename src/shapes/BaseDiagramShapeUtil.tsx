import React from "react";
import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  TLResizeInfo,
  Rectangle2d,
  resizeBox,
} from "tldraw";
import type { DiagramNodeShape } from "./diagram-shapes";
import {
  SHAPE_COLORS,
  SHAPE_DEFAULTS,
  FONT,
} from "./shared/shape-styles";

// Import to ensure module augmentation is loaded
import "./diagram-shapes";

/**
 * Base class for all diagram node shapes.
 * Provides box geometry, label rendering, editing, and resizing.
 * Subclasses override renderShape() to provide the visual outline.
 */
export abstract class BaseDiagramShapeUtil<
  S extends DiagramNodeShape
> extends ShapeUtil<S> {
  override canEdit() {
    return true;
  }

  override canResize() {
    return true;
  }

  override getGeometry(shape: S): any {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override onResize(shape: S, info: TLResizeInfo<S>) {
    return resizeBox(shape, info) as any;
  }

  override onEditEnd(shape: S) {
    const trimmed = shape.props.label.trim();
    if (trimmed !== shape.props.label) {
      this.editor.updateShapes([
        { id: shape.id, type: shape.type, props: { label: trimmed } },
      ]);
    }
  }

  /** Subclasses implement this to render the shape outline */
  abstract renderShape(
    shape: S,
    colors: { fill: string; stroke: string; text: string }
  ): React.ReactElement;

  override component(shape: S) {
    const colors = SHAPE_COLORS[shape.props.color] ?? SHAPE_COLORS.blue;
    const isEditing = this.editor.getEditingShapeId() === shape.id;

    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: "all",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          {/* Shape outline (SVG) */}
          <svg
            width={shape.props.w}
            height={shape.props.h}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              overflow: "visible",
            }}
          >
            {this.renderShape(shape, colors)}
          </svg>

          {/* Label */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: SHAPE_DEFAULTS.padding,
              fontFamily: FONT.family,
              fontSize: FONT.size,
              lineHeight: FONT.lineHeight,
              color: colors.text,
              textAlign: "center",
              wordBreak: "break-word",
              overflow: "hidden",
            }}
          >
            {isEditing ? (
              <textarea
                defaultValue={shape.props.label}
                autoFocus
                style={{
                  width: "100%",
                  height: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  fontFamily: FONT.family,
                  fontSize: FONT.size,
                  lineHeight: FONT.lineHeight,
                  color: colors.text,
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                }}
                onBlur={(e) => {
                  this.editor.updateShapes([
                    {
                      id: shape.id,
                      type: shape.type,
                      props: { label: e.currentTarget.value },
                    },
                  ]);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    this.editor.updateShapes([
                      {
                        id: shape.id,
                        type: shape.type,
                        props: { label: e.currentTarget.value },
                      },
                    ]);
                    this.editor.setEditingShape(null);
                  }
                  if (e.key === "Escape") {
                    this.editor.setEditingShape(null);
                  }
                  e.stopPropagation();
                }}
              />
            ) : (
              <span>{shape.props.label}</span>
            )}
          </div>
        </div>
      </HTMLContainer>
    );
  }
}
