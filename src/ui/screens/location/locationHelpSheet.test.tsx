import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { M4_COPY } from "../../copy/strings";
import { LocationHelpSheet } from "./LocationHelpSheet";

describe("S11b location help sheet", () => {
  it("renders the one bilingual recovery path without a fake settings action", () => {
    for (const locale of ["en", "te"] as const) {
      const copy = M4_COPY[locale];
      const html = renderToStaticMarkup(
        <LocationHelpSheet
          copy={copy}
          onDismiss={() => undefined}
          onRetry={() => undefined}
        />,
      );

      expect(html).toContain(copy.locHelpTitle);
      expect(html).toContain(copy.locHelpBody.replaceAll('"', "&quot;"));
      expect(html).toContain(copy.locHelpNote);
      expect(html).toContain(copy.ctaRetry);
      expect(html).not.toContain(copy.cdSettings);
      expect(html).toContain('data-position="expanded"');
    }
  });
});
