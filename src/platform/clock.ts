export interface Clock {
  nowEpochMs(): number;
}

export interface Scheduler {
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
}

export const browserClock: Clock = {
  nowEpochMs: () => Date.now(),
};

export const browserScheduler: Scheduler = {
  schedule: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  cancel: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function secondsToEpochMs(seconds: number): number {
  const epochMsPerSecond = 1000; // GROUNDED-EXEMPT: SI unit conversion.
  return seconds * epochMsPerSecond;
}

export function minutesToEpochMs(minutes: number): number {
  const secondsPerMinute = 60; // GROUNDED-EXEMPT: SI unit conversion.
  return secondsToEpochMs(minutes * secondsPerMinute);
}
