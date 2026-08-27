import { describe, expect, it } from "vitest";

import {
  requestGeolocationPermission,
  type GeolocationPermissionRequester,
} from "./geolocationPermission";

describe("location permission request", () => {
  it("reports the browser result from the explained request", async () => {
    const granted: GeolocationPermissionRequester = {
      getCurrentPosition(success) {
        success({} as GeolocationPosition);
      },
    };
    const denied: GeolocationPermissionRequester = {
      getCurrentPosition(_success, error) {
        error?.({} as GeolocationPositionError);
      },
    };

    await expect(requestGeolocationPermission(granted)).resolves.toBe("granted");
    await expect(requestGeolocationPermission(denied)).resolves.toBe("denied");
  });
});
