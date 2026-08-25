import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gallerySource = readFileSync(
  "src/ui/gallery/ComponentGallery.tsx",
  "utf8",
);
const routeSource = readFileSync("app/component-gallery/page.tsx", "utf8");

describe("T1.3 component gallery", () => {
  it("includes every C1-C14 component contract", () => {
    const components = [
      "SaayaButton",
      "BigActionButton",
      "LadderCard",
      "CountdownRing",
      "StatusPill",
      "ZoneChip",
      "DisclosureBanner",
      "SaayaBottomSheet",
      "PinEntryBox",
      "StatRow",
      "SectionHeader",
      "EmptyState",
      "MapControlButton",
      "ArmBanner",
    ];

    for (const component of components) {
      expect(gallerySource).toContain(component);
    }
  });

  it("makes every shared button and ladder state inspectable", () => {
    for (const state of ["default", "pressed", "disabled", "focused", "loading"]) {
      expect(gallerySource).toContain(`"${state}"`);
    }
    for (const phase of ["entering", "visible", "answered", "deadline-passed"]) {
      expect(gallerySource).toContain(`"${phase}"`);
    }
    for (const rung of ["CHECKIN_1", "CHECKIN_2", "FAMILY_ESCALATED"]) {
      expect(gallerySource).toContain(`"${rung}"`);
    }
  });

  it("keeps the route development-only and the gallery side-effect free", () => {
    expect(routeSource).toContain('process.env.NODE_ENV === "production"');
    expect(routeSource).toContain("notFound()");
    for (const forbidden of ["fetch(", "localStorage", "sessionStorage", "setTimeout("]) {
      expect(gallerySource).not.toContain(forbidden);
    }
  });
});
