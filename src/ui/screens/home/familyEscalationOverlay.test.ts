import { describe, expect, it } from "vitest";

import { CANCEL_WINDOW_SEC } from "../../../domain/engine/rules";
import { localizedStaticRiskLevel } from "../../copy/localizedRiskLevel";
import { M4_COPY } from "../../copy/strings";
import { composeFamilyMessage } from "./FamilyEscalationOverlay";

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
    expect(message).toContain("No message is sent and no location is shared.");
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
});
