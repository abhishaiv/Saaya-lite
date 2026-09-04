import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { M4_COPY } from "../../copy/strings";
import { AboutScreen } from "./AboutScreen";
import { SettingsScreen } from "./SettingsScreen";

describe("M4 Settings ownership", () => {
  it("renders only M4-owned Settings rows in both languages", () => {
    for (const locale of ["en", "te"] as const) {
      const copy = M4_COPY[locale];
      const html = renderToStaticMarkup(
        <SettingsScreen
          copy={copy}
          locale={locale}
          onBack={() => undefined}
          onLocaleChange={() => undefined}
          onOpenAbout={() => undefined}
          onOpenDemo={() => undefined}
        />,
      );
      expect(html).toContain(copy.setTitle);
      expect(html).toContain(copy.setAbout);
      expect(html).toContain(copy.setDemo);
      expect(html).toContain(copy.setDemoSub);
      expect(html).toContain(copy.policeNoGovtLink);
      expect(html).not.toContain(copy.setFavourites);
      expect(html).toContain(copy.setLanguage);
      expect(html).toContain(copy.setLanguageEnglish);
      expect(html).toContain(copy.setLanguageTelugu);
      expect(html).not.toContain(copy.setPin);
      expect(html).not.toContain(copy.setPolice);
    }
  });
});

describe("M4 About screen", () => {
  it("renders only claims built at the M4 checkpoint in every bilingual section", () => {
    for (const locale of ["en", "te"] as const) {
      const copy = M4_COPY[locale];
      const html = renderToStaticMarkup(
        <AboutScreen
          copy={copy}
          founderContact={null}
          mockedClaims={[copy.familyMockDisclosure]}
          onBack={() => undefined}
          realClaims={[
            copy.aboutRealMap,
            copy.aboutRealDetail,
          ]}
          versionCode={"test".length}
          versionName="test-build"
        />,
      );
      const currentRealItems = [
        copy.aboutRealMap,
        copy.aboutRealDetail,
      ];
      const futureRealItems = [
        copy.aboutRealArm,
        copy.aboutRealLadder,
        copy.aboutRealFamily,
        copy.aboutRealSos,
        copy.aboutRealWrites,
        copy.aboutRealConsole,
      ];
      const decodedHtml = html.replaceAll("&#x27;", "'");

      expect(decodedHtml).toContain(copy.aboutTitle);
      expect(decodedHtml).toContain(copy.aboutWhatBody);
      for (const item of currentRealItems) expect(decodedHtml).toContain(item);
      for (const item of futureRealItems) {
        expect(decodedHtml).not.toContain(item);
      }
      expect(decodedHtml).toContain(copy.aboutMockTitle);
      expect(decodedHtml).toContain(copy.familyMockDisclosure);
      expect(decodedHtml).not.toContain(copy.aboutMockConsole);
      expect(decodedHtml).toContain(copy.policeNoGovtLink);
      expect(decodedHtml).toContain(copy.aboutNoAiBody);
      expect(decodedHtml).toContain(copy.aboutDataBody);
      expect(decodedHtml).toContain(copy.aboutAttribFonts);
      expect(decodedHtml).not.toContain("mailto:");
    }
  });

  it("publishes only a configured founder contact", () => {
    const founderContact = "founder@example.test";
    const html = renderToStaticMarkup(
      <AboutScreen
        copy={M4_COPY.en}
        founderContact={founderContact}
        mockedClaims={[]}
        onBack={() => undefined}
        realClaims={[M4_COPY.en.aboutRealMap]}
        versionCode={"test".length}
        versionName="test-build"
      />,
    );

    expect(html).toContain(`mailto:${founderContact}`);
    expect(html).toContain(founderContact);
  });
});
