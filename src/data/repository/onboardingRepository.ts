import type { PinHasher, StoredPinHash } from "../../platform/pinHash";

export interface Favourite {
  readonly name: string;
  readonly phone: string;
}

export interface OnboardingRepository {
  loadOnboarded(): Promise<boolean>;
  loadPrimaryFavourite(): Promise<Favourite | null>;
  saveOnboarded(): Promise<void>;
  savePin(pin: string): Promise<void>;
  savePrimaryFavourite(favourite: Favourite): Promise<void>;
  verifyPin(pin: string): Promise<boolean>;
}

export class FakeOnboardingRepository implements OnboardingRepository {
  onboarded = false;
  primaryFavourite: Favourite | null = null;
  storedPin: StoredPinHash | null = null;

  constructor(private readonly pinHasher: PinHasher) {}

  async loadOnboarded(): Promise<boolean> {
    return this.onboarded;
  }

  async loadPrimaryFavourite(): Promise<Favourite | null> {
    return this.primaryFavourite;
  }

  async saveOnboarded(): Promise<void> {
    this.onboarded = true;
  }

  async savePin(pin: string): Promise<void> {
    this.storedPin = await this.pinHasher.create(pin);
  }

  async savePrimaryFavourite(favourite: Favourite): Promise<void> {
    this.primaryFavourite = favourite;
  }

  async verifyPin(pin: string): Promise<boolean> {
    if (this.storedPin === null) return false;
    return this.pinHasher.verify(pin, this.storedPin);
  }
}
