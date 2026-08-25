/** DOM pointer capture stays in the platform boundary, not in shared UI components. */
export function capturePointer(target: HTMLElement, pointerId: number) {
  target.setPointerCapture(pointerId);
}

export function releasePointer(target: HTMLElement, pointerId: number) {
  if (target.hasPointerCapture(pointerId)) {
    target.releasePointerCapture(pointerId);
  }
}
