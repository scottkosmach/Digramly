import { StateNode, createShapeId } from "tldraw";
import type { DiagramNodeType } from "@/shapes/diagram-shapes";

/**
 * Tool for placing diagram shapes on the canvas.
 * When active, clicking on the canvas creates a new shape of the selected type.
 */
export class DiagramShapeTool extends StateNode {
  static override id = "diagram-shape";

  // Track which shape type to place — set from the toolbar
  shapeType: DiagramNodeType = "diagram-box";

  override onPointerDown() {
    const { currentPagePoint } = this.editor.inputs;

    const id = createShapeId();
    this.editor.createShape({
      id,
      type: this.shapeType,
      x: currentPagePoint.x - 80, // Center on click
      y: currentPagePoint.y - 35,
    });

    this.editor.select(id);
    // Switch back to select tool after placing
    this.editor.setCurrentTool("select");
  }
}
