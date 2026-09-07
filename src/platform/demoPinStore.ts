import {
  BrowserPinHasher,
  type PinHasher,
  type StoredPinHash,
} from "./pinHash";

/** Local browser storage used solely for the PIN that stops a demo SOS. */
export interface DemoPinStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEMO_PIN_KEY = "saaya-lite.demo-pin";

function browserStorage(): DemoPinStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * A separate, local-only PIN record for the guided product demo. It neither
 * reads nor writes the onboarding repository's real safety PIN.
 */
export class DemoPinStore {
  constructor(
    private readonly hasher: PinHasher = new BrowserPinHasher(),
    private readonly storage: DemoPinStorage | null = browserStorage(),
  ) {}

  async savePin(pin: string): Promise<boolean> {
    const stored = await this.hasher.create(pin);
    try {
      this.storage?.setItem(DEMO_PIN_KEY, JSON.stringify(stored));
      return this.storage !== null;
    } catch {
      return false;
    }
  }

  async hasPin(): Promise<boolean> {
    try {
      const serialized = this.storage?.getItem(DEMO_PIN_KEY);
      return (
        serialized !== null &&
        serialized !== undefined &&
        parseStoredPinHash(serialized) !== null
      );
    } catch {
      return false;
    }
  }

  async verifyPin(pin: string): Promise<boolean> {
    try {
      const serialized = this.storage?.getItem(DEMO_PIN_KEY);
      if (serialized === null || serialized === undefined) return false;
      const stored = parseStoredPinHash(serialized);
      return stored === null ? false : this.hasher.verify(pin, stored);
    } catch {
      return false;
    }
  }
}

function parseStoredPinHash(value: string): StoredPinHash | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("algorithm" in parsed) ||
      !("hashBase64" in parsed) ||
      !("saltBase64" in parsed) ||
      typeof parsed.algorithm !== "string" ||
      typeof parsed.hashBase64 !== "string" ||
      typeof parsed.saltBase64 !== "string"
    ) {
      return null;
    }
    return parsed as StoredPinHash;
  } catch {
    return null;
  }
}
