/**
 * Her own lists, on her own device: the places she saved, the ones she starred, the
 * categories she picked, and the two counters her profile can honestly state.
 *
 * The same discipline as every other repository in this tree: an interface, the IndexedDB
 * implementation beside the other stores, and a Fake written in the same file so the
 * screen tests never touch a database. There is no upload path here, and there is nothing
 * to add one to: every method reads or writes local storage and returns.
 *
 * `picks` is written by the onboarding delta (Part 3e); until that beat exists the list is
 * empty and the feed's "for you" says so through its why line rather than guessing at a
 * taste she has not stated.
 */

/** The ceiling on starred top spots. */
export const MAX_TOP_SPOTS = 3; // fact: home.topSpots.max

/** One week in epoch milliseconds, for the profile's own counter. */
export const MILLISECONDS_PER_WEEK = 604800000; // GROUNDED-EXEMPT: unit conversion, one week in epoch milliseconds.

/**
 * How many weeks she has had Saaya: the week of first use is week one, so a profile opened
 * on the day she finished onboarding reads 1 rather than 0. A clock that has moved backwards
 * still reads one week, because a stamp from the future is not a smaller number of weeks.
 */
export function weeksUsing(
  firstUsedAtEpochMs: number | null,
  nowEpochMs: number,
): number | null {
  if (firstUsedAtEpochMs === null) return null;
  const elapsed = nowEpochMs - firstUsedAtEpochMs;
  if (elapsed < 0) return 1;
  return Math.floor(elapsed / MILLISECONDS_PER_WEEK) + 1;
}

export interface SavedPlace {
  readonly placeId: string;
  readonly savedAtEpochMs: number;
}

export interface PersonalState {
  readonly checkInsAccepted: number;
  readonly firstUsedAtEpochMs: number | null;
  /** The category ids she picked, in the order she picked them. */
  readonly picks: readonly string[];
  /** Saved places, newest save first. */
  readonly savedPlaces: readonly SavedPlace[];
  /** Starred place ids, in the order she starred them, at most `MAX_TOP_SPOTS`. */
  readonly topSpots: readonly string[];
}

export const EMPTY_PERSONAL_STATE: PersonalState = {
  checkInsAccepted: 0,
  firstUsedAtEpochMs: null,
  picks: [],
  savedPlaces: [],
  topSpots: [],
};

export interface PersonalRepository {
  /** The whole local picture, one read. */
  load(): Promise<PersonalState>;
  /** Records the first open, once. Later calls leave the stored stamp alone. */
  markFirstUse(epochMs: number): Promise<void>;
  /** One accepted check-in, counted. */
  recordCheckInAccepted(): Promise<void>;
  /** Saves a place, or refreshes the stamp of one already saved. */
  savePlace(placeId: string, epochMs: number): Promise<void>;
  /** Removes a saved place, and its star with it. */
  unsavePlace(placeId: string): Promise<void>;
  /** Stars or unstars a top spot. Starring past the ceiling keeps the earliest stars. */
  setTopSpot(placeId: string, starred: boolean): Promise<void>;
  setPicks(picks: readonly string[]): Promise<void>;
}

export class FakePersonalRepository implements PersonalRepository {
  state: PersonalState = EMPTY_PERSONAL_STATE;

  async load(): Promise<PersonalState> {
    return this.state;
  }

  async markFirstUse(epochMs: number): Promise<void> {
    if (this.state.firstUsedAtEpochMs !== null) return;
    this.state = { ...this.state, firstUsedAtEpochMs: epochMs };
  }

  async recordCheckInAccepted(): Promise<void> {
    this.state = {
      ...this.state,
      checkInsAccepted: this.state.checkInsAccepted + 1,
    };
  }

  async savePlace(placeId: string, epochMs: number): Promise<void> {
    const rest = this.state.savedPlaces.filter(
      (saved) => saved.placeId !== placeId,
    );
    this.state = {
      ...this.state,
      savedPlaces: [{ placeId, savedAtEpochMs: epochMs }, ...rest],
    };
  }

  async unsavePlace(placeId: string): Promise<void> {
    this.state = {
      ...this.state,
      savedPlaces: this.state.savedPlaces.filter(
        (saved) => saved.placeId !== placeId,
      ),
      topSpots: this.state.topSpots.filter((id) => id !== placeId),
    };
  }

  async setTopSpot(placeId: string, starred: boolean): Promise<void> {
    this.state = { ...this.state, topSpots: nextTopSpots(this.state.topSpots, placeId, starred) };
  }

  async setPicks(picks: readonly string[]): Promise<void> {
    this.state = { ...this.state, picks: [...picks] };
  }
}

/** The star list a change produces: append when there is room, remove on unstar. */
export function nextTopSpots(
  topSpots: readonly string[],
  placeId: string,
  starred: boolean,
): readonly string[] {
  if (!starred) return topSpots.filter((id) => id !== placeId);
  if (topSpots.includes(placeId)) return topSpots;
  if (topSpots.length >= MAX_TOP_SPOTS) return topSpots;
  return [...topSpots, placeId];
}
