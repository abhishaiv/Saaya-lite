import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { M4_COPY } from "../../copy/strings";
import { bundledZoneRepository } from "../../../data/repository/zoneRepository";
import { SosOverlay } from "./SosOverlay";

describe("M1 direct SOS surface", () => {
  it("keeps the user-controlled emergency dial action and prototype disclosure visible", () => {
    const html = renderToStaticMarkup(
      <SosOverlay
        copy={M4_COPY.en}
        nearestStation={bundledZoneRepository.snapshot().policeStations[0] ?? null}
        onPinAccepted={() => undefined}
      />,
    );

    expect(html).toContain('href="tel:112"'); // fact: data.emergency.number.in
    expect(html).toContain('href="tel:181"'); // fact: data.emergency.number.women_support
    expect(html).toContain("This beta does not send a report.");
    expect(html).toContain(M4_COPY.en.policeNoGovtLink);
    expect(html).toContain(M4_COPY.en.ctaStopSos);
  });
});
