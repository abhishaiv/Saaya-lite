"use client";

import { useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

export type SaayaBottomSheetPosition = "peek" | "expanded";

export type SaayaBottomSheetProps = Readonly<{
  /** The parent owns the snap point so screen state remains authoritative. */
  position: SaayaBottomSheetPosition;
  /** Expanded height minus the 160 px peek, measured outside this UI component. */
  dragRangePx: number;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  onPositionChange: (position: SaayaBottomSheetPosition) => void;
  onDismiss: () => void;
}>;

type DragState = Readonly<{
  pointerId: number;
  startClientY: number;
  startOffsetPx: number;
  offsetPx: number;
}>;

export const SAAYA_BOTTOM_SHEET_PEEK_PX = 160;

const DISMISS_THRESHOLD_PERCENT = 40;
const FULL_PERCENT = 100;

function offsetFor(
  position: SaayaBottomSheetPosition,
  dragRangePx: number,
) {
  return position === "expanded" ? 0 : dragRangePx;
}

/** C8's controlled two-snap sheet. Its caller supplies the actual pixel drag range. */
export function SaayaBottomSheet({
  position,
  dragRangePx,
  ariaLabel,
  children,
  className,
  onPositionChange,
  onDismiss,
}: SaayaBottomSheetProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const actualDragRangePx = Math.max(0, dragRangePx);
  const settledOffsetPx = offsetFor(position, actualDragRangePx);
  const renderedOffsetPx = drag?.offsetPx ?? settledOffsetPx;
  const classes = ["saaya-bottom-sheet", className].filter(Boolean).join(" ");

  function releasePointer(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      pointerId: event.pointerId,
      startClientY: event.clientY,
      startOffsetPx: settledOffsetPx,
      offsetPx: settledOffsetPx,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (drag?.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const deltaY = event.clientY - drag.startClientY;
    setDrag({
      ...drag,
      offsetPx: Math.max(0, drag.startOffsetPx + deltaY),
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (drag?.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    releasePointer(event);

    const deltaY = event.clientY - drag.startClientY;
    const draggedPercent = (deltaY / actualDragRangePx) * FULL_PERCENT;

    setDrag(null);

    if (
      actualDragRangePx > 0 &&
      draggedPercent > DISMISS_THRESHOLD_PERCENT
    ) {
      onDismiss();
      return;
    }

    if (deltaY < 0) {
      onPositionChange("expanded");
      return;
    }

    if (deltaY > 0) {
      onPositionChange("peek");
      return;
    }

    onPositionChange(position === "peek" ? "expanded" : "peek");
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    if (drag?.pointerId !== event.pointerId) {
      return;
    }

    releasePointer(event);
    setDrag(null);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onPositionChange(position === "peek" ? "expanded" : "peek");
  }

  return (
    <section
      className={classes}
      data-dragging={drag === null ? undefined : "true"}
      data-position={position}
      style={{ transform: `translate3d(0, ${renderedOffsetPx}px, 0)` }}
    >
      <div className="saaya-bottom-sheet__content">{children}</div>

      <button
        aria-expanded={position === "expanded"}
        aria-label={ariaLabel}
        className="saaya-bottom-sheet__drag-target"
        onKeyDown={handleKeyDown}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        type="button"
      >
        <span aria-hidden="true" className="saaya-bottom-sheet__handle" />
      </button>

      <style jsx>{`
        .saaya-bottom-sheet {
          position: fixed;
          inset-inline: 0;
          inset-block-end: 0;
          block-size: 55vh;
          overflow: hidden;
          border-radius: 22px 22px 0 0;
          background: var(--color-card-fill);
          transition: transform 340ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }

        .saaya-bottom-sheet[data-dragging="true"] {
          transition: none;
        }

        .saaya-bottom-sheet__drag-target {
          position: absolute;
          inset-block-start: 0;
          inset-inline-start: 50%;
          inline-size: 48px;
          block-size: 48px;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: grab;
          touch-action: none;
          transform: translateX(-50%);
        }

        .saaya-bottom-sheet__drag-target:active {
          cursor: grabbing;
        }

        .saaya-bottom-sheet__handle {
          position: absolute;
          inset-block-start: 8px;
          inset-inline-start: 50%;
          inline-size: 32px;
          block-size: 4px;
          background: rgb(from var(--color-text-primary) r g b / 0.3);
          transform: translateX(-50%);
          transition: none;
        }

        .saaya-bottom-sheet__content {
          block-size: 100%;
          overflow: auto;
          transition: none;
        }
      `}</style>
    </section>
  );
}
