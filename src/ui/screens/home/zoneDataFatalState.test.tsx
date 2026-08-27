import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { M4_COPY } from "../../copy/strings";
import { ZoneDataFatalState } from "./ZoneDataFatalState";

describe("M4 fatal zone-data state", () => {
  it("blocks the map with the frozen explanation and retry in both languages", () => {
    for (const locale of ["en", "te"] as const) {
      const copy = M4_COPY[locale];
      const html = renderToStaticMarkup(
        <ZoneDataFatalState locale={locale} onRetry={() => undefined} />,
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain(copy.errZoneData);
      expect(html).toContain(copy.ctaRetry);
      expect(html).not.toContain(copy.cdMap);
    }
  });
});
