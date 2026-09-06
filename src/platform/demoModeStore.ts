export interface DemoModeStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

const DEMO_SESSION_PREFIX = "saaya.demo-session:";
const MARKED_VALUE = "marked";

function browserStorage(): DemoModeStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function demoSessionKey(sessionId: string): string {
  return `${DEMO_SESSION_PREFIX}${sessionId}`;
}

/** Session-scoped display metadata; it never enters PersistedSession. */
export function markDemoArmedSession(
  sessionId: string,
  storage: DemoModeStorage | null = browserStorage(),
): void {
  try {
    storage?.setItem(demoSessionKey(sessionId), MARKED_VALUE);
  } catch {
    // Storage denial must not break the active, visibly labelled demo.
  }
}

export function isDemoArmedSession(
  sessionId: string,
  storage: DemoModeStorage | null = browserStorage(),
): boolean {
  try {
    return storage?.getItem(demoSessionKey(sessionId)) === MARKED_VALUE;
  } catch {
    return false;
  }
}

export function clearDemoArmedSession(
  sessionId: string,
  storage: DemoModeStorage | null = browserStorage(),
): void {
  try {
    storage?.removeItem(demoSessionKey(sessionId));
  } catch {
    // Best-effort cleanup of private demo metadata.
  }
}
