import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { SessionState } from "../../../domain/model/session";
import { DEMO_WINDOW_SEC } from "../../../domain/engine/rules";
import { formatCopy, M4_COPY } from "../../copy/strings";
import { HomeSessionSurface } from "./HomeSessionSurface";
import type { HomeEngineView } from "./homeEngineBridge";

/** renderToStaticMarkup escapes the same five characters in text and attributes. */
function markupText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

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
      checkInWindowSec={DEMO_WINDOW_SEC}
      copy={M4_COPY.en}
      currentPoint={null}
      demoModeActive={false}
      demoStopAcknowledgement={null}
      engineView={view(state, "MANUAL")}
      familyAlertStatus={null}
      locale="en"
      locationStatus="CURRENT"
      okAcknowledgement={null}
      onArmBannerHidden={() => undefined}
      onCheckInOk={() => undefined}
      onHelpNow={() => undefined}
      onLocationHelpOpen={() => undefined}
      onManualArm={() => undefined}
      onManualDisarm={() => undefined}
      onOpenDemo={() => undefined}
      onPinAccepted={() => undefined}
      pageStoppedWarning={false}
      policeStations={[]}
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

  it("treats a resolved session as the quiet IDLE screen again", () => {
    const html = render("RESOLVED");

    expect(html).toContain(`>${M4_COPY.en.ctaSus}<`);
    expect(html).toContain('data-home-action="demo"');
    expect(html).not.toContain(M4_COPY.en.ctaEndSus);
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
    const idle = render("IDLE", { demoModeActive: true });

    expect(idle).toContain('data-demo-active="true"');
    expect(idle).not.toContain(M4_COPY.en.demoModeActive);

    const live = render("SHADOW", { demoModeActive: true });
    expect(live).toContain("home-session-demo-badge");
    expect(live).toContain(`>${M4_COPY.en.ctaDemo}<`);
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
      formatCopy(M4_COPY.te.ctaCountdown, M4_COPY.te.ctaImOk, DEMO_WINDOW_SEC),
    );
    expect(html).not.toContain(
      `${M4_COPY.te.ctaImOk} · ${DEMO_WINDOW_SEC}s`,
    );
  });

  it("projects every ladder status without exposing a Home disarm shortcut", () => {
    const states: readonly SessionState[] = [
      "CHECKIN_1",
      "CHECKIN_2",
      "CHECKIN_3",
      "SOS_ACTIVE",
    ];

    for (const state of states) {
      const html = render(state);
      expect(html).not.toContain(M4_COPY.en.ctaArmManually);
      expect(html).not.toContain(M4_COPY.en.ctaImHome);
    }

    expect(render("CHECKIN_1")).toContain(M4_COPY.en.checkin1Title);
    expect(render("CHECKIN_2")).toContain(M4_COPY.en.checkin2Title);
    expect(render("CHECKIN_3")).toContain(M4_COPY.en.checkin3Title);
    expect(render("SOS_ACTIVE")).toContain(M4_COPY.en.sosTitle);
    expect(render("CHECKIN_1")).toContain('data-swipe-dismisses="visual-only"');
    expect(render("CHECKIN_3")).toContain('data-swipe-dismisses="visual-only"');
  });

  it("renders the rung-three ladder card body that warns the timer ends in SOS", () => {
    const html = render("CHECKIN_3", { checkInWindowSec: DEMO_WINDOW_SEC });

    expect(html).toContain(M4_COPY.en.checkin3Title);
    expect(html).toContain("SOS starts when this timer ends");
    expect(html).toContain(formatCopy(M4_COPY.en.ctaCountdown, M4_COPY.en.ctaImOk, DEMO_WINDOW_SEC));
  });

  it("shows the truthful family-alert status line on the check-in card", () => {
    expect(render("CHECKIN_1")).not.toContain(M4_COPY.en.alertStatusSending);

    const sending = render("CHECKIN_1", { familyAlertStatus: "sending" });
    expect(sending).toContain(M4_COPY.en.alertStatusSending);

    const failed = render("CHECKIN_2", { familyAlertStatus: "failed" });
    expect(failed).toContain(M4_COPY.en.alertStatusFailed);

    const accepted = render("CHECKIN_2", { familyAlertStatus: "accepted" });
    expect(accepted).toContain(M4_COPY.en.alertStatusAccepted);
    expect(accepted).toContain(markupText(M4_COPY.en.alertCancelNote));
  });

  it("acknowledges I'm OK on the SHADOW screen after the ladder resets", () => {
    const okAcknowledgement = {
      title: M4_COPY.en.okThanksTitle,
      body: formatCopy(
        M4_COPY.en.okThanksBody,
        formatCopy(M4_COPY.en.durationSeconds, DEMO_WINDOW_SEC),
      ),
    };
    const html = render("SHADOW", { okAcknowledgement });

    expect(html).toContain(M4_COPY.en.okThanksTitle);
    expect(html).toContain(okAcknowledgement.body);
    expect(html).toContain('role="status"');
  });

  it("acknowledges a demo PIN stop on the quiet IDLE screen", () => {
    const demoStopAcknowledgement = {
      title: M4_COPY.en.okThanksTitle,
      body: M4_COPY.en.demoResetDone,
    };
    const html = render("IDLE", { demoStopAcknowledgement });

    expect(html).toContain(M4_COPY.en.demoResetDone);
    expect(html).toContain('role="status"');
  });

  it("renders the synthetic demo incident on the SOS view only in demo mode", () => {
    const demo = render("SOS_ACTIVE", { demoModeActive: true, demoMissedCheckins: 3 });

    expect(demo).toContain(M4_COPY.en.policeDemoLabel);
    expect(demo).toContain(M4_COPY.en.policeDemoLocalNote);
    expect(demo).toContain(formatCopy(M4_COPY.en.policeDemoRowMissed, 1));
    expect(demo).toContain(M4_COPY.en.policeDemoStatusActive);

    const live = render("SOS_ACTIVE");
    expect(live).toContain(M4_COPY.en.sosTitle);
    expect(live).not.toContain(M4_COPY.en.policeDemoLabel);
    expect(live).not.toContain(M4_COPY.en.policeDemoLocalNote);
    const immediate = render("SOS_ACTIVE", { demoModeActive: true, demoMissedCheckins: 0 });
    expect(immediate).not.toContain(formatCopy(M4_COPY.en.policeDemoRowMissed, 1));
    expect(immediate).toContain(M4_COPY.en.policeDemoRowSos);
  });
});
