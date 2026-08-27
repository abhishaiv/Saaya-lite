export interface DemoModeStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

const DEMO_MODE_KEY = "saaya.demo-speed";
const DEMO_SESSION_PREFIX = "saaya.demo-session:";
const ENABLED_VALUE = "enabled";
const MARKED_VALUE = "marked";

function browserStorage(): DemoModeStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Demo labelling must survive the same reload that recovers its session. */
export function loadDemoSpeedEnabled(
  storage: DemoModeStorage | null = browserStorage(),
): boolean {
  try {
    return storage?.getItem(DEMO_MODE_KEY) === ENABLED_VALUE;
  } catch {
    return false;
  }
}

export function saveDemoSpeedEnabled(
  enabled: boolean,
  storage: DemoModeStorage | null = browserStorage(),
): void {
  try {
    if (enabled) storage?.setItem(DEMO_MODE_KEY, ENABLED_VALUE);
    else storage?.removeItem(DEMO_MODE_KEY);
  } catch {
    // Storage denial must not break the in-memory, visibly labelled demo.
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
