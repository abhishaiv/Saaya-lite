export type GeolocationPermissionState = PermissionState | "unsupported";

export async function readGeolocationPermissionState(): Promise<GeolocationPermissionState> {
  if (navigator.permissions === undefined) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unsupported";
  }
}
