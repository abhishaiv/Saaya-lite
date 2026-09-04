import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { SessionState } from "../../../domain/model/session";
import { CHECK_IN_1_SEC } from "../../../domain/engine/rules";
import { formatCopy, M4_COPY } from "../../copy/strings";
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
      activeZoneDetail={null}
      armAcknowledgement={null}
      armBannerVisible={false}
      checkInReason={null}
      copy={M4_COPY.en}
      currentPoint={null}
      demoModeActive={false}
      demoSpeedEnabled={false}
      engineView={view(state, "MANUAL")}
      locale="en"
      locationStatus="CURRENT"
      onArmBannerHidden={() => undefined}
      onCheckInOk={() => undefined}
      onFamilyCancel={() => undefined}
      onHelpNow={() => undefined}
      onLocationHelpOpen={() => undefined}
      onManualArm={() => undefined}
      onManualDisarm={() => undefined}
      onOpenDemo={() => undefined}
      onPinAccepted={() => undefined}
      pageStoppedWarning={false}
      policeStations={[]}
      sessionId={null}
      {...options}
    />,
  );
}

describe("M4 Home session surface", () => {
  it("uses a compact direct-action dock instead of a persistent Home sheet", () => {
    const html = render("IDLE");

    expect(html).toContain("home-session-action-dock");
    expect(html).toContain('data-home-action="sus"');
    expect(html).toContain('data-home-action="demo"');
    expect(html).toContain('data-home-action="sos"');
    expect(html).toContain(`>${M4_COPY.en.ctaSus}<`);
    expect(html).toContain(`>${M4_COPY.en.ctaDemo}<`);
    expect(html).toContain(`>${M4_COPY.en.ctaSos}<`);
    expect(html).toContain(`aria-label="${M4_COPY.en.ctaDemo}"`);
    expect(html).toContain(`aria-label="${M4_COPY.en.ctaSos}"`);
    expect(html).not.toContain("saaya-bottom-sheet");
    expect(html).not.toContain(M4_COPY.en.warnKeepOpenBody);
  });

  it("shows automatic SHADOW with its transient acknowledgement and a compact end action", () => {
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
    expect(html.split(M4_COPY.en.homeArmBannerBody)).toHaveLength(2);
    expect(html).toContain(`>${M4_COPY.en.ctaEndSus}<`);
    expect(html).toContain('data-home-action="sos"');
    expect(html).not.toContain(M4_COPY.en.warnKeepOpenBody);
  });

  it("does not keep the automatic-arm acknowledgement as a second persistent map surface", () => {
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
    expect(html).not.toContain(M4_COPY.te.homeArmBannerBody);
  });

  it("shows the honest permission warning without claiming the active watch is healthy", () => {
    const html = render("IDLE", { locationStatus: "PERMISSION_DENIED" });

    expect(html).toContain(M4_COPY.en.warnLocationDenied);
    expect(html).toContain("data-location-help-trigger");
    expect(html).not.toContain(M4_COPY.en.warnKeepOpenBody);
  });

  it("labels active Demo state on the compact dock without a full-width disclosure", () => {
    const html = render("IDLE", { demoModeActive: true });

    expect(html).toContain('data-demo-active="true"');
    expect(html).not.toContain(M4_COPY.en.demoModeActive);
  });

  it("keeps SUS as the shared term while translating the surrounding Telugu action", () => {
    const html = render("SHADOW", {
      copy: M4_COPY.te,
      engineView: view("SHADOW", "MANUAL"),
    });

    expect(html).toContain(M4_COPY.te.ctaEndSus);
    expect(html).toContain('aria-label="SUS ఆపు"');
  });

  it("uses a copy-backed Telugu countdown action rather than an English suffix", () => {
    const html = render("CHECKIN_1", {
      copy: M4_COPY.te,
      locale: "te",
    });

    expect(html).toContain(
      formatCopy(
        M4_COPY.te.ctaCountdown,
        M4_COPY.te.ctaImOk,
        CHECK_IN_1_SEC,
      ),
    );
    expect(html).not.toContain(
      `${M4_COPY.te.ctaImOk} · ${CHECK_IN_1_SEC}s`,
    );
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
    expect(render("SOS_ACTIVE")).toContain(M4_COPY.en.sosTitle);
    expect(render("CHECKIN_1")).toContain('data-swipe-dismisses="visual-only"');
    expect(render("FAMILY_ESCALATED")).toContain('data-swipe-dismisses="visual-only"');
  });
});
