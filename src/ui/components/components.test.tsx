import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RiskTier } from "../../domain/model/zone";
import { MaterialSymbol, materialSymbolOpticalSize } from "../icons/MaterialSymbol";
import { ArmBanner } from "./ArmBanner";
import { BigActionButton } from "./BigActionButton";
import { CountdownRing } from "./CountdownRing";
import { DisclosureBanner } from "./DisclosureBanner";
import { EmptyState } from "./EmptyState";
import { LADDER_CARD_BACK_POLICY, LadderCard } from "./LadderCard";
import { MapControlButton } from "./MapControlButton";
import { PinEntryBox } from "./PinEntryBox";
import { SaayaBottomSheet } from "./SaayaBottomSheet";
import { SaayaButton } from "./SaayaButton";
import { SectionHeader } from "./SectionHeader";
import { StatRow } from "./StatRow";
import { StatusPill, type StatusPillLabels } from "./StatusPill";
import { ZoneChip } from "./ZoneChip";
import { bottomSheetOffset, bottomSheetRelease } from "./saayaStyles";

const STATUS_LABELS: StatusPillLabels = {
  idle: "Not watching",
  shadowAuto: "Watching this stretch",
  shadowManual: "Watching, you turned this on",
  checkIn1: "Checking in",
  checkIn2: "Still there?",
  family: "Telling your favourites",
  sos: "SOS active",
};

function noop() {}

function ladderMarkup(rung: "CHECKIN_1" | "CHECKIN_2" | "FAMILY_ESCALATED") {
  const shared = {
    message: "Message",
    phase: "visible" as const,
    primary: <button type="button">Primary</button>,
    secondary: <button type="button">Secondary</button>,
    title: "Title",
  };

  if (rung === "CHECKIN_1") {
    return renderToStaticMarkup(<LadderCard {...shared} rung="CHECKIN_1" />);
  }

  if (rung === "CHECKIN_2") {
    return renderToStaticMarkup(<LadderCard {...shared} rung="CHECKIN_2" />);
  }

  return renderToStaticMarkup(<LadderCard {...shared} rung="FAMILY_ESCALATED" />);
}

describe("C1 and C2 action controls", () => {
  it("makes loading a disabled, localized busy state", () => {
    const markup = renderToStaticMarkup(
      <SaayaButton loading workingLabel="Working">
        Continue
      </SaayaButton>,
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-label="Working"');
    expect(markup).toContain("disabled");
    expect(markup).not.toContain(">Continue<");
  });

  it("keeps the BigAction test tag stable and removes a zero suffix", () => {
    const running = renderToStaticMarkup(
      <BigActionButton
        accent="brand"
        countdownSeconds={42} // GROUNDED-EXEMPT: component-spec illustration, not a product timer.
        label="I'm OK"
        workingLabel="Working"
      />,
    );
    const finished = renderToStaticMarkup(
      <BigActionButton
        accent="brand"
        countdownSeconds={0}
        label="I'm OK"
        workingLabel="Working"
      />,
    );

    expect(running).toContain('data-testid="checkin-imok"');
    expect(running).toContain("I&#x27;m OK · 42s"); // GROUNDED-EXEMPT: asserts the component-spec illustration used above.
    expect(finished).toContain("I&#x27;m OK");
    expect(finished).not.toContain("· 0s");
  });
});

describe("C3 and C4 ladder surfaces", () => {
  it("closes the back policy and never makes the card dismissible", () => {
    expect(LADDER_CARD_BACK_POLICY).toEqual({
      CHECKIN_1: "delegate",
      CHECKIN_2: "consume",
      FAMILY_ESCALATED: "consume",
    });

    for (const rung of ["CHECKIN_1", "CHECKIN_2", "FAMILY_ESCALATED"] as const) {
      const markup = ladderMarkup(rung);
      expect(markup).toContain('role="dialog"');
      expect(markup).toContain('aria-modal="true"');
      expect(markup).toContain('data-scrim-dismisses="false"');
      expect(markup).toContain('data-swipe-dismisses="false"');
    }
  });

  it("removes a deadline-passed card", () => {
    const markup = renderToStaticMarkup(
      <LadderCard
        message="Message"
        phase="deadline-passed"
        primary={null}
        rung="CHECKIN_1"
        secondary={null}
        title="Title"
      />,
    );

    expect(markup).toBe("");
  });

  it("clamps countdowns at zero and announces only the frozen thresholds", () => {
    const render = (seconds: number) =>
      renderToStaticMarkup(
        <CountdownRing
          ariaLabel="Countdown"
          formatAnnouncement={(remaining) => `${remaining} seconds remaining`}
          rung="CHECKIN_1"
          seconds={seconds}
          totalSeconds={90}
          variant="card"
        />,
      );

    expect(render(-1)).toContain('countdown-ring__numeral">0<');
    expect(render(60)).toContain("60 seconds remaining");
    expect(render(30)).toContain("30 seconds remaining");
    expect(render(10)).toContain("10 seconds remaining");
    expect(render(4)).toContain("4 seconds remaining");
    expect(render(5)).not.toContain("5 seconds remaining");
  });
});

describe("C5 to C8 status and spatial components", () => {
  it("renders every localized status label without changing its case", () => {
    const examples = [
      renderToStaticMarkup(<StatusPill icon="visibility" labels={STATUS_LABELS} state="IDLE" />),
      renderToStaticMarkup(<StatusPill armMode="AUTO_ZONE" labels={STATUS_LABELS} state="SHADOW" />),
      renderToStaticMarkup(<StatusPill armMode="MANUAL" labels={STATUS_LABELS} state="SHADOW" />),
      renderToStaticMarkup(<StatusPill labels={STATUS_LABELS} state="CHECKIN_1" />),
      renderToStaticMarkup(<StatusPill labels={STATUS_LABELS} state="CHECKIN_2" />),
      renderToStaticMarkup(<StatusPill labels={STATUS_LABELS} state="FAMILY_ESCALATED" />),
      renderToStaticMarkup(<StatusPill labels={STATUS_LABELS} state="SOS_ACTIVE" />),
    ].join("\n");

    for (const label of Object.values(STATUS_LABELS)) {
      expect(examples).toContain(label);
    }
    expect(examples).not.toContain("text-transform:uppercase");
  });

  it("uses audited zone colour except for SAFE", () => {
    const high = renderToStaticMarkup(
      <ZoneChip colorHex="#FF3B30" riskTier={RiskTier.HIGH} />,
    );
    const safe = renderToStaticMarkup(
      <ZoneChip colorHex="#00000000" riskTier={RiskTier.SAFE} />,
    );

    expect(high).toContain("--zone-chip-color:#FF3B30");
    expect(safe).toContain("--zone-chip-color:var(--color-text-secondary)");
  });

  it("makes disclosures notes with no dismiss path", () => {
    const markup = renderToStaticMarkup(
      <DisclosureBanner content="Mock: synthetic delivery." kind="mock" />,
    );

    expect(markup).toContain('role="note"');
    expect(markup).toContain('data-disclosure-kind="mock"');
    expect(markup).not.toContain("<button");
  });

  it("keeps bottom-sheet snap state controlled and pure", () => {
    const thresholdPx = (160 * 40) / 100; // GROUNDED-EXEMPT: test derives the specified percentage boundary for this fixture range.
    expect(bottomSheetOffset(false, 160)).toBe(160);
    expect(bottomSheetOffset(true, 160)).toBe(0);
    expect(bottomSheetRelease(thresholdPx, 160, "expanded")).toBe("peek");
    expect(bottomSheetRelease(thresholdPx + 1, 160, "expanded")).toBe("dismiss");
    expect(bottomSheetRelease(-1, 160, "peek")).toBe("expanded");
    expect(bottomSheetRelease(0, 160, "peek")).toBe("expanded");
    const markup = renderToStaticMarkup(
      <SaayaBottomSheet
        ariaLabel="Zone details"
        dragRangePx={160}
        onDismiss={noop}
        onPositionChange={noop}
        position="peek"
      >
        Content
      </SaayaBottomSheet>,
    );
    expect(markup).toContain('data-position="peek"');
    expect(markup).toContain('aria-expanded="false"');
  });
});

describe("C9 to C14 content components", () => {
  it("keeps the PIN masked, numeric, paste-blocked and locked when required", () => {
    const markup = renderToStaticMarkup(
      <PinEntryBox
        ariaLabel="PIN"
        lockedCountdown="Try again in 60 seconds"
        lockedMessage="Too many attempts."
        onChange={noop}
        state="locked"
        value="12"
      />,
    );
    const source = readFileSync("src/ui/components/PinEntryBox.tsx", "utf8");

    expect(markup).toContain('type="password"');
    expect(markup).toContain('inputMode="numeric"');
    expect(markup).toContain('maxLength="4"');
    expect(markup).toContain("disabled");
    expect(source).toContain("onPaste={preventPaste}");
    expect(source).toContain("event.preventDefault()");
  });

  it("keeps StatRow and SectionHeader semantic", () => {
    expect(renderToStaticMarkup(<StatRow label="Zones" value={24} />)).toMatch(
      /<dl[^>]*>.*<dt[^>]*>Zones<\/dt>.*<dd[^>]*>24<\/dd>/,
    );
    expect(
      renderToStaticMarkup(<SectionHeader level={2}>Nearest station</SectionHeader>),
    ).toContain("<h2");
  });

  it("renders EmptyState action optionally and map controls accessibly", () => {
    const empty = renderToStaticMarkup(
      <EmptyState body="No favourites yet." icon="group" title="No favourites" />,
    );
    const withAction = renderToStaticMarkup(
      <EmptyState
        action={{ label: "Add favourite", onClick: noop, workingLabel: "Working" }}
        body="No favourites yet."
        icon="group"
        title="No favourites"
      />,
    );
    const mapControl = renderToStaticMarkup(
      <MapControlButton icon="my_location" label="Centre my location" onClick={noop} />,
    );

    expect(empty).not.toContain("<button");
    expect(withAction).toContain("<button");
    expect(mapControl).toContain('aria-label="Centre my location"');
    expect(mapControl).toContain('type="button"');
  });

  it("clamps the 16 px icon optical size and keeps utility icons outlined", () => {
    expect(materialSymbolOpticalSize(16)).toBe(20);
    const utility = renderToStaticMarkup(
      <MaterialSymbol decorative fill="utility" name="settings" size={24} />,
    );
    const filledButton = renderToStaticMarkup(
      <MaterialSymbol
        decorative
        fill="state"
        name="check_circle"
        size={20}
        weight="button"
      />,
    );
    expect(utility).toContain("--material-symbol-fill:0");
    expect(utility).toContain("--material-symbol-opsz:24");
    expect(filledButton).toContain("--material-symbol-fill:1");
    expect(filledButton).toContain("--material-symbol-weight:500");
  });

  it("keeps ArmBanner copy in a polite status region", () => {
    const markup = renderToStaticMarkup(
      <ArmBanner
        body="You are in this zone. You did not have to do anything."
        onAutoHide={noop}
        title="Saaya woke by itself"
      />,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Saaya woke by itself");
    expect(markup).toContain("You did not have to do anything");
  });
});
