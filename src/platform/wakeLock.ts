export interface WakeLockSentinelLike {
  readonly released: boolean;
  release(): Promise<void>;
  addEventListener(type: "release", listener: () => void): void;
}

export interface WakeLockApi {
  request(type: "screen"): Promise<WakeLockSentinelLike>;
}

export class WakeLockController {
  private armed = false;
  private visible = true;
  private sentinel: WakeLockSentinelLike | null = null;
  private requestInFlight: Promise<void> | null = null;

  constructor(private readonly api: WakeLockApi | null) {}

  async setArmed(armed: boolean): Promise<void> {
    this.armed = armed;
    if (!armed) {
      await this.release();
      return;
    }
    await this.acquireIfNeeded();
  }

  async setVisible(visible: boolean): Promise<void> {
    this.visible = visible;
    if (!visible) {
      await this.release();
      return;
    }
    await this.acquireIfNeeded();
  }

  isHeld(): boolean {
    return this.sentinel !== null && !this.sentinel.released;
  }

  private async acquireIfNeeded(): Promise<void> {
    if (
      this.api === null ||
      !this.armed ||
      !this.visible ||
      this.isHeld()
    ) {
      return;
    }
    if (this.requestInFlight !== null) return this.requestInFlight;

    this.requestInFlight = this.api
      .request("screen")
      .then(async (sentinel) => {
        if (!this.armed || !this.visible) {
          await sentinel.release();
          return;
        }
        this.sentinel = sentinel;
        sentinel.addEventListener("release", () => {
          if (this.sentinel === sentinel) this.sentinel = null;
        });
      })
      .catch(() => {
        // Wake Lock is best effort. The visible-page ladder and absolute
        // deadlines remain the authority if the browser refuses it.
      })
      .finally(() => {
        this.requestInFlight = null;
      });
    return this.requestInFlight;
  }

  private async release(): Promise<void> {
    const sentinel = this.sentinel;
    this.sentinel = null;
    if (sentinel === null || sentinel.released) return;
    await sentinel.release().catch(() => {
      // A browser may release it first while the page is being hidden.
    });
  }
}

export function browserWakeLockApi(): WakeLockApi | null {
  const wakeLock = navigator.wakeLock;
  if (wakeLock === undefined) return null;
  return {
    request: (type) =>
      wakeLock.request(type) as Promise<unknown> as Promise<WakeLockSentinelLike>,
  };
}
