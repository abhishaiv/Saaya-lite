/** Consumes browser Back while an inescapable ladder surface is active. */
export function installConsumeBackGuard(onBack?: () => void): () => void {
  const state = globalThis.history.state;
  const guardedState =
    typeof state === "object" && state !== null
      ? { ...state, saayaSosBackGuard: true }
      : { saayaSosBackGuard: true };

  globalThis.history.pushState(guardedState, "", globalThis.location.href);
  const guardBackNavigation = () => {
    onBack?.();
    globalThis.history.pushState(guardedState, "", globalThis.location.href);
  };
  globalThis.addEventListener("popstate", guardBackNavigation);

  return () => {
    globalThis.removeEventListener("popstate", guardBackNavigation);
  };
}
