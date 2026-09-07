import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { M4_COPY, formatCopy } from "../../copy/strings";
import { bundledZoneRepository } from "../../../data/repository/zoneRepository";
import { SosOverlay, type SosDemoIncident } from "./SosOverlay";

function demoIncident(): SosDemoIncident {
  return {
    label: M4_COPY.en.policeDemoLabel,
    localNote: M4_COPY.en.policeDemoLocalNote,
    rows: [
      M4_COPY.en.policeDemoRowArmed,
      formatCopy(M4_COPY.en.policeDemoRowMissed, 1),
      formatCopy(M4_COPY.en.policeDemoRowMissed, 2),
      formatCopy(M4_COPY.en.policeDemoRowMissed, 3),
      M4_COPY.en.policeDemoRowSos,
    ],
    statusActive: M4_COPY.en.policeDemoStatusActive,
    zoneRow: `${M4_COPY.en.policeDemoZone}: Station One`,
  };
}

describe("M1 direct SOS surface", () => {
  it("uses the separate demo PIN store only for a labelled demo incident", () => {
    const source = readFileSync(
      new URL("./SosOverlay.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('import { DemoPinStore } from "../../../platform/demoPinStore";');
    expect(source).toContain(
      "const pinVerifier = demoIncident === null ? repository : demoPinStore;",
    );
    expect(source).toContain(".catch(() => {");
    expect(source).toContain("setIsChecking(false);");
  });

  it("keeps the user-controlled emergency dial action and prototype disclosure visible", () => {
    const html = renderToStaticMarkup(
      <SosOverlay
        copy={M4_COPY.en}
        demoIncident={null}
        nearestStation={bundledZoneRepository.snapshot().policeStations[0] ?? null}
        onPinAccepted={() => undefined}
      />,
    );

    expect(html).toContain('href="tel:112"'); // fact: data.emergency.number.in
    expect(html).toContain('href="tel:181"'); // fact: data.emergency.number.women_support
    expect(html).toContain("This beta does not send a report.");
    expect(html).toContain(M4_COPY.en.policeNoGovtLink);
    expect(html).toContain(M4_COPY.en.ctaStopSos);
    expect(html).not.toContain(M4_COPY.en.policeDemoLabel);
  });

  it("renders the synthetic demo incident section when the demo provides one", () => {
    const incident = demoIncident();
    const html = renderToStaticMarkup(
      <SosOverlay
        copy={M4_COPY.en}
        demoIncident={incident}
        nearestStation={null}
        onPinAccepted={() => undefined}
      />,
    );

    expect(html).toContain(`aria-label="${incident.label}"`);
    expect(html).toContain(`<h2>${incident.label}</h2>`);
    for (const row of incident.rows) {
      expect(html).toContain(`<li>${row}</li>`);
    }
    expect(html).toContain(incident.zoneRow);
    expect(html).toContain(incident.statusActive);
    expect(html).toContain(incident.localNote);
    // The synthetic preview never claims a dispatch was received.
    expect(html).not.toContain(M4_COPY.en.policeDemoRowStopped);
    expect(html).not.toContain(M4_COPY.en.policeDemoStatusStopped);
  });
});
