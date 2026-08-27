export type GeolocationPermissionState = PermissionState | "unsupported";

export type GeolocationRequestResult = "granted" | "denied" | "unavailable";

export interface GeolocationPermissionRequester {
  getCurrentPosition(
    success: PositionCallback,
    error?: PositionErrorCallback | null,
  ): void;
}

export async function readGeolocationPermissionState(): Promise<GeolocationPermissionState> {
  if (navigator.permissions === undefined) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unsupported";
  }
}

/** Requests the one web location permission only after the rationale screen. */
export function requestGeolocationPermission(
  geolocation: GeolocationPermissionRequester = navigator.geolocation,
): Promise<GeolocationRequestResult> {
  return new Promise((resolve) => {
    try {
      geolocation.getCurrentPosition(
        () => resolve("granted"),
        () => resolve("denied"),
      );
    } catch {
      resolve("unavailable");
    }
  });
}
