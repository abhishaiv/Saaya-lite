import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { SessionState } from "../../../domain/model/session";
import { M4_COPY } from "../../copy/strings";
import { AppSessionStatus } from "./AppSessionStatus";
import type { HomeEngineView } from "./homeEngineBridge";

function view(state: SessionState): HomeEngineView {
  return {
    activeZoneId: null,
    armMode: "AUTO_ZONE",
    armedAtEpochMs: null,
    armedHourBand: null,
    deadlineEpochMs: null,
    outcome: null,
    state,
  };
}

describe("M4 app-shell session status", () => {
  it("keeps every active state visible above routes and sheets", () => {
    const labels = [
      ["SHADOW", M4_COPY.en.statusShadowAuto],
      ["CHECKIN_1", M4_COPY.en.statusCheckin1],
      ["CHECKIN_2", M4_COPY.en.statusCheckin2],
      ["FAMILY_ESCALATED", M4_COPY.en.statusFamily],
      ["SOS_ACTIVE", M4_COPY.en.statusSos],
    ] as const;

    for (const [state, label] of labels) {
      const html = renderToStaticMarkup(
        <AppSessionStatus copy={M4_COPY.en} showIdle={false} view={view(state)} />,
      );
      expect(html).toContain(label);
      expect(html).toContain("app-session-status");
    }
  });

  it("renders IDLE only when a screen explicitly opts in", () => {
    expect(
      renderToStaticMarkup(
        <AppSessionStatus copy={M4_COPY.en} showIdle view={view("IDLE")} />,
      ),
    ).toContain(M4_COPY.en.statusIdle);
    expect(
      renderToStaticMarkup(
        <AppSessionStatus copy={M4_COPY.en} showIdle={false} view={view("IDLE")} />,
      ),
    ).toBe("");
  });
});
