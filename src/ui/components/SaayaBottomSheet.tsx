"use client";

import { useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

import { capturePointer, releasePointer } from "../../platform/pointerCapture";
import {
  bottomSheetOffset,
  bottomSheetRelease,
} from "./saayaStyles";

export type SaayaBottomSheetPosition = "peek" | "expanded";

export type SaayaBottomSheetProps = Readonly<{
  /** The parent owns the snap point so screen state remains authoritative. */
  position: SaayaBottomSheetPosition;
  /** Expanded height minus the 160 px peek, measured outside this UI component. */
  dragRangePx: number | null;
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
  const actualDragRangePx = Math.max(0, dragRangePx ?? 0);
  const settledOffsetPx = bottomSheetOffset(
    position === "expanded",
    actualDragRangePx,
  );
  const renderedOffsetPx = drag?.offsetPx ?? settledOffsetPx;
  const renderedTransform =
    dragRangePx === null && drag === null && position === "peek"
      ? "translate3d(0, calc(var(--sheet-expanded-height) - var(--sheet-peek-height)), 0)"
      : `translate3d(0, ${renderedOffsetPx}px, 0)`;
  const classes = ["saaya-bottom-sheet", className].filter(Boolean).join(" ");

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }

    event.preventDefault();
    capturePointer(event.currentTarget, event.pointerId);
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
    releasePointer(event.currentTarget, event.pointerId);

    const deltaY = event.clientY - drag.startClientY;
    const release = bottomSheetRelease(
      deltaY,
      actualDragRangePx,
      position,
    );

    setDrag(null);

    if (release === "dismiss") {
      onDismiss();
      return;
    }

    onPositionChange(release);
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    if (drag?.pointerId !== event.pointerId) {
      return;
    }

    releasePointer(event.currentTarget, event.pointerId);
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
      style={{ transform: renderedTransform }}
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
          block-size: var(--sheet-expanded-height);
          overflow: hidden;
          border-radius: var(--radius-card) var(--radius-card) 0 0;
          background: var(--color-card-fill);
          transition: transform var(--motion-340) var(--motion-spring-soft);
          will-change: transform;
        }

        .saaya-bottom-sheet[data-dragging="true"] {
          transition: none;
        }

        .saaya-bottom-sheet__drag-target {
          position: absolute;
          inset-block-start: 0;
          inset-inline-start: 50%; /* GROUNDED-EXEMPT: structural centring of the drag target */
          inline-size: 48px;
          block-size: 48px;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: grab;
          touch-action: none;
          transform: translateX(-50%); /* GROUNDED-EXEMPT: structural half-width centring transform */
        }

        .saaya-bottom-sheet__drag-target:active {
          cursor: grabbing;
        }

        .saaya-bottom-sheet__handle {
          position: absolute;
          inset-block-start: 8px;
          inset-inline-start: 50%; /* GROUNDED-EXEMPT: structural centring of the visual handle */
          inline-size: 32px;
          block-size: 4px;
          background: rgb(from var(--color-text-primary) r g b / 0.3);
          transform: translateX(-50%); /* GROUNDED-EXEMPT: structural half-width centring transform */
          transition: none;
        }

        .saaya-bottom-sheet__content {
          block-size: 100%; /* GROUNDED-EXEMPT: content fills the specified sheet surface */
          overflow: auto;
          transition: none;
        }
      `}</style>
    </section>
  );
}
