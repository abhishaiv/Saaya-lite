/** Keeps keyboard focus inside the live SOS or PIN surface. */
export function installSosFocusTrap(container: HTMLElement): () => void {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  const focusable = () =>
    Array.from(container.querySelectorAll<HTMLElement>(selector));
  const focusFirst = () => focusable()[0]?.focus();
  const trap = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const elements = focusable();
    if (elements.length === 0) return;
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  focusFirst();
  container.addEventListener("keydown", trap);
  return () => container.removeEventListener("keydown", trap);
}
