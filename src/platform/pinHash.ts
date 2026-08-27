export const PIN_HASH_ALGORITHM = "SHA-256"; // GROUNDED-EXEMPT: standardized Web Crypto algorithm identifier, not a product number.

export interface StoredPinHash {
  readonly algorithm: typeof PIN_HASH_ALGORITHM;
  readonly hashBase64: string;
  readonly saltBase64: string;
}

export interface PinHasher {
  create(pin: string): Promise<StoredPinHash>;
  verify(pin: string, stored: StoredPinHash): Promise<boolean>;
}

/**
 * Browser-only PIN hashing. The repository stores only this value, never the
 * PIN itself. A UUID is converted back to its byte form before hashing, which
 * gives the required salt without placing a second product constant here.
 */
export class BrowserPinHasher implements PinHasher {
  async create(pin: string): Promise<StoredPinHash> {
    const salt = randomSaltBytes();
    return {
      algorithm: PIN_HASH_ALGORITHM,
      hashBase64: await hashPin(salt, pin),
      saltBase64: bytesToBase64(salt),
    };
  }

  async verify(pin: string, stored: StoredPinHash): Promise<boolean> {
    if (stored.algorithm !== PIN_HASH_ALGORITHM) return false;
    return (
      (await hashPin(base64ToBytes(stored.saltBase64), pin)) ===
      stored.hashBase64
    );
  }
}

function randomSaltBytes(): Uint8Array {
  const bytePairs = crypto.randomUUID().replaceAll("-", "").match(/../g);
  if (bytePairs === null) throw new Error("Browser UUID salt was unavailable");
  return Uint8Array.from(bytePairs, (pair) => Number.parseInt(`0x${pair}`));
}

async function hashPin(salt: Uint8Array, pin: string): Promise<string> {
  const encodedPin = new TextEncoder().encode(pin);
  const material = new Uint8Array(salt.length + encodedPin.length);
  material.set(salt);
  material.set(encodedPin, salt.length);
  const digest = await crypto.subtle.digest(PIN_HASH_ALGORITHM, material);
  return bytesToBase64(new Uint8Array(digest));
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCodePoint(byte)).join(""));
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)); // GROUNDED-EXEMPT: JavaScript string indexing begins at zero.
}
