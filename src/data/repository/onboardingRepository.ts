import type { PinHasher, StoredPinHash } from "../../platform/pinHash";

export interface Favourite {
  readonly name: string;
  readonly phone: string;
}

export type StoredLocale = "en" | "te";

export interface OnboardingRepository {
  loadLanguage(): Promise<StoredLocale | null>;
  loadOnboarded(): Promise<boolean>;
  loadPrimaryFavourite(): Promise<Favourite | null>;
  loadUserName(): Promise<string | null>;
  saveOnboarded(): Promise<void>;
  saveLanguage(locale: StoredLocale): Promise<void>;
  savePin(pin: string): Promise<void>;
  savePrimaryFavourite(favourite: Favourite): Promise<void>;
  saveUserName(userName: string | null): Promise<void>;
  verifyPin(pin: string): Promise<boolean>;
}

export class FakeOnboardingRepository implements OnboardingRepository {
  language: StoredLocale | null = null;
  onboarded = false;
  primaryFavourite: Favourite | null = null;
  storedPin: StoredPinHash | null = null;
  userName: string | null = null;

  constructor(private readonly pinHasher: PinHasher) {}

  async loadOnboarded(): Promise<boolean> {
    return this.onboarded;
  }

  async loadLanguage(): Promise<StoredLocale | null> {
    return this.language;
  }

  async loadPrimaryFavourite(): Promise<Favourite | null> {
    return this.primaryFavourite;
  }

  async loadUserName(): Promise<string | null> {
    return this.userName;
  }

  async saveOnboarded(): Promise<void> {
    this.onboarded = true;
  }

  async saveLanguage(locale: StoredLocale): Promise<void> {
    this.language = locale;
  }

  async savePin(pin: string): Promise<void> {
    this.storedPin = await this.pinHasher.create(pin);
  }

  async savePrimaryFavourite(favourite: Favourite): Promise<void> {
    this.primaryFavourite = favourite;
  }

  async saveUserName(userName: string | null): Promise<void> {
    this.userName = userName;
  }

  async verifyPin(pin: string): Promise<boolean> {
    if (this.storedPin === null) return false;
    return this.pinHasher.verify(pin, this.storedPin);
  }
}
