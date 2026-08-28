import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { M4_COPY } from "../../copy/strings";
import { PoliceViewScreen } from "./PoliceViewScreen";

describe("S10 PoliceViewScreen - the trust screen (F28)", () => {
  it("renders all three honest sections and prototype disclaimer in English and Telugu", () => {
    for (const locale of ["en", "te"] as const) {
      const copy = M4_COPY[locale];
      const html = renderToStaticMarkup(
        <PoliceViewScreen
          copy={copy}
          onBack={() => undefined}
        />,
      );

      // Header
      expect(html).toContain(copy.policeTitle);
      expect(html).toContain(copy.cdBack);

      // Section 1: Right now: nothing.
      expect(html).toContain(copy.policeNowNothing);
      expect(html).toContain(copy.policeNowBody);

      // Section 2: If you miss two check-ins (Sample SUS)
      expect(html).toContain(copy.policeSusTitle);
      expect(html).toContain(copy.policeSusBody);
      expect(html).toContain("dwaraka_police_station");
      expect(html).toContain("high");
      expect(html).toContain("NIGHT_DEEP");
      expect(html).toContain("2026-08-22"); // GROUNDED-EXEMPT: fixture date in rendered card.
      expect(html).toContain("No coordinate");
      expect(html).toContain("No session ID");
      expect(html).toContain("No name");

      // Section 3: If SOS triggers (Sample SOS)
      expect(html).toContain(copy.policeSosTitle);
      expect(html).toContain(copy.policeSosBody);
      expect(html).toContain("17.7242"); // GROUNDED-EXEMPT: fixture coordinate in rendered card.
      expect(html).toContain("83.3024"); // GROUNDED-EXEMPT: fixture coordinate in rendered card.
      expect(html).toContain("Dwaraka PS");
      expect(html).toContain("Pseudonymous ID");
      expect(html).toContain("Identity crosses only at SOS");

      // Permanent disclaimer footer
      expect(html).toContain(copy.policeNoGovtLink);
    }
  });
});
