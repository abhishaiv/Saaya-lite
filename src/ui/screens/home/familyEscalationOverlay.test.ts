import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CANCEL_WINDOW_SEC } from "../../../domain/engine/rules";
import { localizedStaticRiskLevel } from "../../copy/localizedRiskLevel";
import { M4_COPY } from "../../copy/strings";
import {
  canOfferFamilyMessageHandoff,
  composeFamilyMessage,
  FamilyEscalationOverlay,
  FamilyMessageHandoffControls,
  prepareFamilyMessageHandoff,
  resolveFamilyEscalationLabels,
} from "./FamilyEscalationOverlay";

const MESSAGE_INPUT = {
  cancelWindowSec: CANCEL_WINDOW_SEC,
  day: "Friday",
  distanceM: Number.MAX_SAFE_INTEGER,
  name: "Meera",
  stationName: "II Town Police Station",
  stationPhone: "phone",
  time: "4:05 AM",
  womenSafetyCases: Number.MAX_SAFE_INTEGER,
  zoneArea: "Soldierpet",
  zoneName: "Beach Road",
  zoneRisk: "High",
};

describe("family message copy", () => {
  it("uses the English template without a second hard-coded preview", () => {
    const message = composeFamilyMessage(M4_COPY.en, MESSAGE_INPUT);

    expect(message).toContain("Saaya alert - Meera may need help.");
    expect(message).toContain("Prepared locally by Saaya Lite.");
    expect(message).not.toContain("No message is sent");
    expect(message).not.toMatch(/%\d+\$[ds]/);
  });

  it("uses the Telugu template while preserving data fields", () => {
    const message = composeFamilyMessage(M4_COPY.te, MESSAGE_INPUT);

    expect(message).toContain("సాయ హెచ్చరిక");
    expect(message).toContain("Meera");
    expect(message).toContain("Beach Road");
    expect(message).not.toContain("Saaya alert");
    expect(message).not.toMatch(/%\d+\$[ds]/);
  });

  it("does not confuse the static source category with the hour-aware band", () => {
    expect(localizedStaticRiskLevel(M4_COPY.te, "High Risk")).toBe(
      M4_COPY.te.riskLevelHigh,
    );
    expect(localizedStaticRiskLevel(M4_COPY.te, "Moderate Risk")).toBe(
      M4_COPY.te.riskLevelModerate,
    );
    expect(localizedStaticRiskLevel(M4_COPY.te, "Elevated Risk")).toBe(
      M4_COPY.te.riskLevelElevated,
    );
  });

  it("renders bilingual handoff controls without constructing a device URI", () => {
    const message = "Meera's note:\nతెలుగు text with spaces";
    const english = renderToStaticMarkup(
      createElement(FamilyMessageHandoffControls, {
        copy: M4_COPY.en,
        favourite: { name: "Asha", phone: "+919876543210" }, // GROUNDED-EXEMPT: synthetic test favourite number.
        message,
        sessionId: "active-session",
      }),
    );
    const telugu = renderToStaticMarkup(
      createElement(FamilyMessageHandoffControls, {
        copy: M4_COPY.te,
        favourite: { name: "ఆశ", phone: "+919876543210" }, // GROUNDED-EXEMPT: synthetic test favourite number.
        message,
        sessionId: "active-session",
      }),
    );

    expect(english).toContain(`aria-label="${M4_COPY.en.ctaSendSms}"`);
    expect(english).toContain(`aria-label="${M4_COPY.en.ctaSendWhatsapp}"`);
    expect(telugu).toContain(`aria-label="${M4_COPY.te.ctaSendSms}"`);
    expect(telugu).toContain(`aria-label="${M4_COPY.te.ctaSendWhatsapp}"`);
    expect(english).toContain(M4_COPY.en.familyMockDisclosure);
    expect(telugu).toContain(M4_COPY.te.familyMockDisclosure);
    expect(english).toContain('data-disclosure-kind="prototype-limitation"');
    expect(english).toContain('href="#family-message-preview"');
    expect(english).not.toContain("sms:");
    expect(english).not.toContain("whatsapp:");
    expect(english).not.toContain("wa.me");
  });

  it("constructs the exact displayed message only after the direct control action", () => {
    const message = "Meera's note:\nతెలుగు text with spaces";
    const uri = prepareFamilyMessageHandoff({
      favourite: { name: "Asha", phone: "+919876543210" }, // GROUNDED-EXEMPT: synthetic test favourite number.
      kind: "whatsapp",
      message,
    });

    expect(uri).not.toBeNull();
    if (uri === null) throw new Error("Expected a device handoff URI");
    expect(new URL(uri).protocol).toBe("whatsapp:");
    expect(new URL(uri).searchParams.get("text")).toBe(message);
  });

  it("omits handoff controls for invalid local recipient data", () => {
    const markup = renderToStaticMarkup(
      createElement(FamilyMessageHandoffControls, {
        copy: M4_COPY.en,
        favourite: { name: "Asha", phone: "+91" },
        message: "Prepared locally",
        sessionId: "active-session",
      }),
    );

    expect(markup).not.toContain("data-family-handoff");
    expect(markup).not.toContain(M4_COPY.en.familyMockDisclosure);
    expect(
      canOfferFamilyMessageHandoff(
        { name: "Asha", phone: "+91" },
        "Prepared locally",
        "active-session",
      ),
    ).toBe(false);

    const labels = resolveFamilyEscalationLabels(
      M4_COPY.en,
      true,
      false,
      false,
    );
    expect(labels.title).toBe(M4_COPY.en.familyNoContact);
    expect(labels.ariaLabel).toBe(M4_COPY.en.familyNoContact);
    expect(labels.ariaLabel).not.toBe(M4_COPY.en.annFamily);
  });

  it("does not announce a handoff before local data makes it available", () => {
    for (const locale of ["en", "te"] as const) {
      const copy = M4_COPY[locale];
      const markup = renderToStaticMarkup(
        createElement(FamilyEscalationOverlay, {
          copy,
          currentPoint: null,
          deadlineEpochMs: null,
          demoSpeedEnabled: false,
          detail: null,
          locale,
          onCancel: () => undefined,
          onHelpNow: () => undefined,
          onMinimize: () => undefined,
          policeStations: [],
          sessionId: null,
        }),
      );

      expect(markup).not.toContain(copy.familyMockDisclosure);
      expect(markup).toContain(`aria-label="${copy.familyTitle}"`);
      expect(markup).not.toContain(`aria-label="${copy.annFamily}"`);
    }
  });

  it("has no Firebase, queue, inferred-handoff state, web fallback or automatic-open path", () => {
    const source = readFileSync(
      new URL("./FamilyEscalationOverlay.tsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(
      /firebase|queue|analytics|familyMessageDelivery|HANDED_TO_DEVICE|window\.open|wa\.me|https?:\/\//i,
    );
  });
});
