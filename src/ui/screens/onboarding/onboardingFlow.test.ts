import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function source(): string {
  return readFileSync(
    new URL("./OnboardingScreen.tsx", import.meta.url),
    "utf8",
  );
}

describe("onboarding flow", () => {
  it("writes onboarded only from the celebration, when she opens the demo", () => {
    const file = source();

    expect(file.match(/saveOnboarded/g)).toHaveLength(1);
    expect(file).toMatch(
      /async function finishTour\(\)[\s\S]*?await repository\.saveOnboarded\(\);[\s\S]*?onCompleted\(\);/,
    );
  });

  it("asks the one web location permission from the rationale screen and reads the fix in the same ask", () => {
    const file = source();

    expect(file).toMatch(
      /const result = await requestGeolocationPermission\(\);[\s\S]*?setFixedLocation\(await readCurrentPositionFix\(\)\);/,
    );
  });

  it("draws the street only when the ask produced a fix, and skips it plainly when it did not", () => {
    expect(source()).toMatch(
      /setStep\(fixedLocation === null \? "PIN" : "STREET"\)/,
    );
  });

  it("shows the street through the walk view itself, with the same zones the map uses", () => {
    const file = source();

    expect(file).toContain("<WalkView");
    expect(file).toMatch(/location={fixedLocation}/);
    expect(file).toMatch(/mapZones={mapZones}/);
  });

  it("holds its loading moment on the walk view's own line, not a second one", () => {
    expect(source()).toMatch(/copy\.walkLoading/);
  });

  it("stops the promise rotation under reduced motion and shows the promises as a list", () => {
    const file = source();

    expect(file).toMatch(/matchMedia\?\.\("\(prefers-reduced-motion: reduce\)"\)/);
    expect(file).toMatch(
      /if \(step !== "PROMISES" \|\| reducedMotion \|\| promiseFrame > lastPromise\) \{/,
    );
    expect(file).toMatch(/<ul className="onboarding-screen__promise-stack">/);
  });

  it("ends the splash on the question with the one button that continues", () => {
    const file = source();

    expect(file).toMatch(/copy\.onbPromiseReadyTitle/);
    expect(file).toMatch(
      /onClick=\{\(\) => setStep\("FAVOURITE"\)\}/,
    );
  });

  it("tours the ladder as one idea per card, over the spec'd rows", () => {
    const file = source();

    expect(file).toMatch(/copy\.onbTourShadowTitle/);
    expect(file).toMatch(/copy\.onbTourCheckinsTitle/);
    expect(file).toMatch(/copy\.onbTourSosTitle/);
    expect(file).toMatch(/copy\.onbTourBody/);
    expect(file).toMatch(/copy\.onbTourShadow[,)]/);
    expect(file).toMatch(/copy\.onbTourCheckins[,)]/);
    expect(file).toMatch(/copy\.onbTourSos[,)]/);
  });

  it("opens the real zone sheet from a street label rather than a look-alike", () => {
    const file = source();

    expect(file).toContain("<ZoneDetailSheet");
    expect(file).toMatch(/currentPoint={fixedLocation}/);
    expect(file).toMatch(/onZoneSelected={setSelectedZoneId}/);
  });

  it("declares the legend's clearance, so the chip clears the onboarding's own bottom row", () => {
    expect(source()).toMatch(/--home-action-dock-clearance: calc\(/);
  });

  it("stops the world's zone names taking taps while a sheet stands over them", () => {
    expect(source()).toMatch(
      /\.onboarding-screen__world\[data-interactive="false"\] \{\s*pointer-events: none;/,
    );
  });
});
