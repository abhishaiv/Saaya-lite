import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { SessionState } from "../../../domain/model/session";
import { M4_COPY } from "../../copy/strings";
import { HomeSessionSurface } from "./HomeSessionSurface";
import type { HomeEngineView } from "./homeEngineBridge";

function view(state: SessionState, armMode: HomeEngineView["armMode"]): HomeEngineView {
  return {
    activeZoneId: null,
    armMode,
    armedAtEpochMs: null,
    armedHourBand: null,
    deadlineEpochMs: null,
    outcome: null,
    state,
  };
}

function render(
  state: SessionState,
  options: Partial<Parameters<typeof HomeSessionSurface>[0]> = {},
) {
  return renderToStaticMarkup(
    <HomeSessionSurface
      armAcknowledgement={null}
      armBannerVisible={false}
      checkInReason={null}
      contextLine={M4_COPY.en.homeHourContext}
      copy={M4_COPY.en}
      demoModeActive={false}
      demoSpeedEnabled={false}
      engineView={view(state, "MANUAL")}
      locationStatus="CURRENT"
      onArmBannerHidden={() => undefined}
      onCheckInOk={() => undefined}
      onLocationHelpOpen={() => undefined}
      onManualArm={() => undefined}
      onManualDisarm={() => undefined}
      pageStoppedWarning={false}
      {...options}
    />,
  );
}

describe("M4 Home session surface", () => {
  it("shows the manual-arm action in the collapsed sheet", () => {
    const html = render("IDLE");

    expect(html).toContain(M4_COPY.en.ctaArmManually);
    expect(html).toContain('data-position="peek"');
    expect(html).not.toContain(M4_COPY.en.ctaImHome);
  });

  it("shows automatic SHADOW, a transient acknowledgement, and the same copy in the sheet", () => {
    const acknowledgement = {
      title: M4_COPY.en.homeArmBannerTitle,
      body: M4_COPY.en.homeArmBannerBody,
    };
    const html = render("SHADOW", {
      armAcknowledgement: acknowledgement,
      armBannerVisible: true,
      engineView: view("SHADOW", "AUTO_ZONE"),
    });

    expect(html).toContain(M4_COPY.en.homeArmBannerTitle);
    expect(html.split(M4_COPY.en.homeArmBannerBody)).toHaveLength(3);
    expect(html).toContain(M4_COPY.en.ctaImHome);
    expect(html).toContain(M4_COPY.en.warnKeepOpenBody);
  });

  it("keeps the automatic-arm detail available after the banner auto-hides", () => {
    const html = render("SHADOW", {
      armAcknowledgement: {
        title: M4_COPY.te.homeArmBannerTitle,
        body: M4_COPY.te.homeArmBannerBody,
      },
      armBannerVisible: false,
      copy: M4_COPY.te,
      engineView: view("SHADOW", "AUTO_ZONE"),
    });

    expect(html).not.toContain(M4_COPY.te.homeArmBannerTitle);
    expect(html).toContain(M4_COPY.te.homeArmBannerBody);
  });

  it("shows the honest permission warning without claiming the active watch is healthy", () => {
    const html = render("IDLE", { locationStatus: "PERMISSION_DENIED" });

    expect(html).toContain(M4_COPY.en.warnLocationDenied);
    expect(html).toContain("data-location-help-trigger");
    expect(html).not.toContain(M4_COPY.en.warnKeepOpenBody);
  });

  it("keeps the labelled demo-speed disclosure visible outside the panel", () => {
    const html = render("IDLE", { demoModeActive: true });

    expect(html).toContain(M4_COPY.en.demoModeActive);
  });

  it("projects every escalated status without exposing a Home disarm shortcut", () => {
    const states: readonly SessionState[] = [
      "CHECKIN_1",
      "CHECKIN_2",
      "FAMILY_ESCALATED",
      "SOS_ACTIVE",
    ];

    for (const state of states) {
      const html = render(state);
      expect(html).not.toContain(M4_COPY.en.ctaArmManually);
      expect(html).not.toContain(M4_COPY.en.ctaImHome);
    }

    expect(render("CHECKIN_1")).toContain(M4_COPY.en.checkin1Title);
    expect(render("CHECKIN_2")).toContain(M4_COPY.en.checkin2Title);
  });
});
