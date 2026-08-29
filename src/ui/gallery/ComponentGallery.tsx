"use client";

import { useState, type ReactNode } from "react";

import { RiskTier } from "../../domain/model/zone";
import { ArmBanner } from "../components/ArmBanner";
import { BigActionButton } from "../components/BigActionButton";
import { CountdownRing } from "../components/CountdownRing";
import { DisclosureBanner } from "../components/DisclosureBanner";
import { EmptyState } from "../components/EmptyState";
import { LadderCard, type LadderCardPhase } from "../components/LadderCard";
import {
  MapControlButton,
  MapControlButtonStack,
} from "../components/MapControlButton";
import { PinEntryBox } from "../components/PinEntryBox";
import {
  SAAYA_BOTTOM_SHEET_PEEK_PX,
  SaayaBottomSheet,
} from "../components/SaayaBottomSheet";
import { SaayaButton } from "../components/SaayaButton";
import { SectionHeader } from "../components/SectionHeader";
import { StatRow } from "../components/StatRow";
import {
  StatusPill,
  type StatusPillLabels,
} from "../components/StatusPill";
import { ZoneChip } from "../components/ZoneChip";

type ButtonPreviewState =
  | "default"
  | "pressed"
  | "disabled"
  | "focused"
  | "loading";

type SaayaButtonPreviewVariant =
  | "Primary"
  | "Accent · brand"
  | "Accent · amber"
  | "Accent · danger"
  | "Ghost"
  | "Destructive"
  | "TextOnly";

type LadderRung = "CHECKIN_1" | "CHECKIN_2" | "FAMILY_ESCALATED";

const BUTTON_PREVIEW_STATES: readonly ButtonPreviewState[] = [
  "default",
  "pressed",
  "disabled",
  "focused",
  "loading",
];

const SAAYA_BUTTON_VARIANTS: readonly SaayaButtonPreviewVariant[] = [
  "Primary",
  "Accent · brand",
  "Accent · amber",
  "Accent · danger",
  "Ghost",
  "Destructive",
  "TextOnly",
];

const LADDER_RUNGS: readonly LadderRung[] = [
  "CHECKIN_1",
  "CHECKIN_2",
  "FAMILY_ESCALATED",
];

const LADDER_PHASES: readonly LadderCardPhase[] = [
  "entering",
  "visible",
  "answered",
  "deadline-passed",
];

const STATUS_LABELS: StatusPillLabels = {
  idle: "Not watching",
  shadowAuto: "Watching this stretch",
  shadowManual: "Watching, you turned this on",
  checkIn1: "Checking in",
  checkIn2: "Still there?",
  family: "Preparing a message",
  sos: "SOS active",
};

const GALLERY_COUNTDOWN_TOTAL = 90; // GROUNDED-EXEMPT: dev-gallery progress fixture, not a product countdown.
const GALLERY_COUNTDOWN_PARTIAL = 42; // GROUNDED-EXEMPT: dev-gallery illustration named in the component spec.
const GALLERY_PIN_PARTIAL = "12"; // GROUNDED-EXEMPT: masked dev-gallery fixture, never a saved PIN.
const GALLERY_PIN_FULL = "0000"; // GROUNDED-EXEMPT: masked dev-gallery fixture, never a saved PIN.
const ARM_BANNER_BODY = "You are in MVP Colony and it is 9:42 PM. You did not have to do anything."; // GROUNDED-EXEMPT: formatted COPY.md gallery example, not a product constant.

function noop() {}

function PreviewSection({
  children,
  id,
  title,
}: Readonly<{ children: ReactNode; id: string; title: string }>) {
  return (
    <section aria-labelledby={id} className="gallery-section">
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

function PreviewCell({
  children,
  label,
  className,
}: Readonly<{ children: ReactNode; className?: string; label: string }>) {
  return (
    <article className={["gallery-cell", className].filter(Boolean).join(" ")}>
      <h3 className="gallery-cell__label">{label}</h3>
      {children}
    </article>
  );
}

function forcedStateClass(state: ButtonPreviewState) {
  if (state === "pressed" || state === "focused") {
    return `gallery-force-${state}`;
  }

  return undefined;
}

function SaayaButtonFixture({
  state,
  variant,
}: Readonly<{
  state: ButtonPreviewState;
  variant: SaayaButtonPreviewVariant;
}>) {
  const shared = {
    className: forcedStateClass(state),
    disabled: state === "disabled",
    loading: state === "loading",
    workingLabel: "Working",
  } as const;

  switch (variant) {
    case "Accent · brand":
      return (
        <SaayaButton {...shared} accent="brand" variant="accent">
          Continue
        </SaayaButton>
      );
    case "Accent · amber":
      return (
        <SaayaButton {...shared} accent="amber" variant="accent">
          Continue
        </SaayaButton>
      );
    case "Accent · danger":
      return (
        <SaayaButton {...shared} accent="danger" variant="accent">
          Continue
        </SaayaButton>
      );
    case "Ghost":
      return (
        <SaayaButton {...shared} variant="ghost">
          Continue
        </SaayaButton>
      );
    case "Destructive":
      return (
        <SaayaButton {...shared} variant="destructive">
          Stop SOS
        </SaayaButton>
      );
    case "TextOnly":
      return (
        <SaayaButton {...shared} variant="textOnly">
          Cancel, I am fine
        </SaayaButton>
      );
    case "Primary":
      return <SaayaButton {...shared}>Continue</SaayaButton>;
  }
}

function BigActionButtonFixture({
  accent,
  state,
}: Readonly<{
  accent: "brand" | "amber" | "danger";
  state: ButtonPreviewState;
}>) {
  return (
    <BigActionButton
      accent={accent}
      className={forcedStateClass(state)}
      countdownSeconds={state === "default" ? GALLERY_COUNTDOWN_PARTIAL : undefined}
      disabled={state === "disabled"}
      label="I'm OK"
      loading={state === "loading"}
      workingLabel="Working"
    />
  );
}

function LadderFixture({
  phase,
  rung,
}: Readonly<{ phase: LadderCardPhase; rung: LadderRung }>) {
  const accent: "brand" | "amber" | "danger" =
    rung === "CHECKIN_1" ? "brand" : rung === "CHECKIN_2" ? "amber" : "danger";
  const primary = (
    <BigActionButton
      accent={accent}
      label="I'm OK"
      workingLabel="Working"
    />
  );
  const secondary = (
    <SaayaButton variant="textOnly" workingLabel="Working">
      Cancel, I am fine
    </SaayaButton>
  );
  const shared = {
    id: `gallery-${rung.toLowerCase()}-${phase}`,
    message: "Tap only if you are safe. Saaya will continue otherwise.",
    phase,
    primary,
    secondary,
    title: rung === "FAMILY_ESCALATED" ? "What your favourite would receive" : "Are you safe?",
  } as const;

  return (
    <div className="gallery-ladder-frame" data-phase={phase}>
      {rung === "CHECKIN_1" ? (
        <LadderCard {...shared} rung="CHECKIN_1" />
      ) : rung === "CHECKIN_2" ? (
        <LadderCard {...shared} rung="CHECKIN_2" />
      ) : (
        <LadderCard {...shared} rung="FAMILY_ESCALATED" />
      )}
      {phase === "deadline-passed" ? (
        <p className="gallery-removed-state">Card removed; ladder continues underneath.</p>
      ) : null}
    </div>
  );
}

function BottomSheetFixture({
  initialPosition,
}: Readonly<{ initialPosition: "peek" | "expanded" }>) {
  const [position, setPosition] = useState(initialPosition);

  return (
    <div className="gallery-sheet-frame">
      <SaayaBottomSheet
        ariaLabel="Zone details"
        dragRangePx={SAAYA_BOTTOM_SHEET_PEEK_PX}
        onDismiss={() => setPosition("peek")}
        onPositionChange={setPosition}
        position={position}
      >
        <div className="gallery-sheet-content">
          <strong>MVP Colony</strong>
          <span>Drag or press the handle to change the snap point.</span>
        </div>
      </SaayaBottomSheet>
    </div>
  );
}

export function ComponentGallery() {
  const [pin, setPin] = useState(GALLERY_PIN_PARTIAL);

  return (
    <main className="component-gallery">
      <header className="gallery-header">
        <p className="gallery-kicker">T1.3 · development only</p>
        <h1>Saaya component gallery</h1>
        <p>
          Every C1–C14 variant and state. Pressed and focused cells are deliberately frozen
          for visual inspection.
        </p>
        <p lang="te">పని జరుగుతోంది</p>
      </header>

      <PreviewSection id="gallery-c1" title="C1 · SaayaButton">
        <div className="gallery-grid">
          {SAAYA_BUTTON_VARIANTS.flatMap((variant) =>
            BUTTON_PREVIEW_STATES.map((state) => (
              <PreviewCell key={`${variant}-${state}`} label={`${variant} · ${state}`}>
                <SaayaButtonFixture state={state} variant={variant} />
              </PreviewCell>
            )),
          )}
        </div>
      </PreviewSection>

      <PreviewSection id="gallery-c2" title="C2 · BigActionButton">
        <div className="gallery-grid">
          {(["brand", "amber", "danger"] as const).flatMap((accent) =>
            BUTTON_PREVIEW_STATES.map((state) => (
              <PreviewCell key={`${accent}-${state}`} label={`${accent} · ${state}`}>
                <BigActionButtonFixture accent={accent} state={state} />
              </PreviewCell>
            )),
          )}
          <PreviewCell label="brand · zero drops suffix">
            <BigActionButton
              accent="brand"
              countdownSeconds={0}
              label="I'm OK"
              workingLabel="Working"
            />
          </PreviewCell>
        </div>
      </PreviewSection>

      <PreviewSection id="gallery-c3" title="C3 · LadderCard">
        <div className="gallery-grid gallery-grid--wide">
          {LADDER_RUNGS.flatMap((rung) =>
            LADDER_PHASES.map((phase) => (
              <PreviewCell key={`${rung}-${phase}`} label={`${rung} · ${phase}`}>
                <LadderFixture phase={phase} rung={rung} />
              </PreviewCell>
            )),
          )}
        </div>
      </PreviewSection>

      <PreviewSection id="gallery-c4" title="C4 · CountdownRing">
        <div className="gallery-grid">
          <PreviewCell label="CHECKIN_1 · full">
            <CountdownRing
              ariaLabel="Check-in countdown"
              formatAnnouncement={(seconds) => `${seconds} seconds remaining`}
              rung="CHECKIN_1"
              seconds={GALLERY_COUNTDOWN_TOTAL}
              totalSeconds={GALLERY_COUNTDOWN_TOTAL}
              variant="card"
            />
          </PreviewCell>
          <PreviewCell label="CHECKIN_2 · partial">
            <CountdownRing
              ariaLabel="Check-in countdown"
              formatAnnouncement={(seconds) => `${seconds} seconds remaining`}
              rung="CHECKIN_2"
              seconds={GALLERY_COUNTDOWN_PARTIAL}
              totalSeconds={GALLERY_COUNTDOWN_TOTAL}
              variant="card"
            />
          </PreviewCell>
          <PreviewCell label="FAMILY_ESCALATED · zero">
            <CountdownRing
              ariaLabel="Family escalation countdown"
              formatAnnouncement={(seconds) => `${seconds} seconds remaining`}
              rung="FAMILY_ESCALATED"
              seconds={0}
              totalSeconds={GALLERY_COUNTDOWN_TOTAL}
              variant="card"
            />
          </PreviewCell>
          <PreviewCell label="SOS_ACTIVE · full screen">
            <CountdownRing
              ariaLabel="SOS countdown"
              formatAnnouncement={(seconds) => `${seconds} seconds remaining`}
              rung="SOS_ACTIVE"
              seconds={GALLERY_COUNTDOWN_PARTIAL}
              totalSeconds={GALLERY_COUNTDOWN_TOTAL}
              variant="sos"
            />
          </PreviewCell>
        </div>
      </PreviewSection>

      <PreviewSection id="gallery-c5" title="C5 · StatusPill">
        <div className="gallery-grid">
          <PreviewCell className="gallery-status-frame" label="IDLE">
            <StatusPill icon="visibility" labels={STATUS_LABELS} state="IDLE" />
          </PreviewCell>
          <PreviewCell className="gallery-status-frame" label="SHADOW · auto">
            <StatusPill armMode="AUTO_ZONE" labels={STATUS_LABELS} state="SHADOW" />
          </PreviewCell>
          <PreviewCell className="gallery-status-frame" label="SHADOW · manual">
            <StatusPill armMode="MANUAL" labels={STATUS_LABELS} state="SHADOW" />
          </PreviewCell>
          <PreviewCell className="gallery-status-frame" label="CHECKIN_1">
            <StatusPill labels={STATUS_LABELS} state="CHECKIN_1" />
          </PreviewCell>
          <PreviewCell className="gallery-status-frame" label="CHECKIN_2">
            <StatusPill labels={STATUS_LABELS} state="CHECKIN_2" />
          </PreviewCell>
          <PreviewCell className="gallery-status-frame" label="FAMILY_ESCALATED">
            <StatusPill labels={STATUS_LABELS} state="FAMILY_ESCALATED" />
          </PreviewCell>
          <PreviewCell className="gallery-status-frame" label="SOS_ACTIVE">
            <StatusPill labels={STATUS_LABELS} state="SOS_ACTIVE" />
          </PreviewCell>
        </div>
      </PreviewSection>

      <PreviewSection id="gallery-c6" title="C6 · ZoneChip">
        <div className="gallery-inline-row">
          <ZoneChip colorHex="#FF3B30" riskTier={RiskTier.HIGH} />
          <ZoneChip colorHex="#FF9500" riskTier={RiskTier.MODERATE} />
          <ZoneChip colorHex="#FFCC00" riskTier={RiskTier.ELEVATED} />
          <ZoneChip colorHex="#00000000" riskTier={RiskTier.SAFE} />
        </div>
      </PreviewSection>

      <PreviewSection id="gallery-c7" title="C7 · DisclosureBanner">
        <div className="gallery-stack">
          <DisclosureBanner content="Mock: this local message preview is not sent." kind="mock" />
          <DisclosureBanner
            content="Keep this page open. A web page cannot arm in the background."
            kind="prototype-limitation"
          />
        </div>
      </PreviewSection>

      <PreviewSection id="gallery-c8" title="C8 · SaayaBottomSheet">
        <div className="gallery-grid">
          <PreviewCell label="peek · interactive">
            <BottomSheetFixture initialPosition="peek" />
          </PreviewCell>
          <PreviewCell label="expanded · interactive">
            <BottomSheetFixture initialPosition="expanded" />
          </PreviewCell>
        </div>
      </PreviewSection>

      <PreviewSection id="gallery-c9" title="C9 · PinEntryBox">
        <div className="gallery-grid">
          <PreviewCell label="empty">
            <PinEntryBox ariaLabel="PIN" onChange={noop} value="" />
          </PreviewCell>
          <PreviewCell label="active · partial">
            <PinEntryBox
              ariaLabel="PIN"
              className="gallery-pin-active"
              onChange={setPin}
              value={pin}
            />
          </PreviewCell>
          <PreviewCell label="filled">
            <PinEntryBox ariaLabel="PIN" onChange={noop} value={GALLERY_PIN_FULL} />
          </PreviewCell>
          <PreviewCell label="error">
            <PinEntryBox ariaLabel="PIN" onChange={noop} state="error" value={GALLERY_PIN_PARTIAL} />
          </PreviewCell>
          <PreviewCell label="locked">
            <PinEntryBox
              ariaLabel="PIN"
              lockedCountdown="Try again in 60 seconds"
              lockedMessage="Too many attempts."
              onChange={noop}
              state="locked"
              value={GALLERY_PIN_FULL}
            />
          </PreviewCell>
        </div>
      </PreviewSection>

      <PreviewSection id="gallery-c10" title="C10 · StatRow">
        <div className="gallery-stack">
          <div className="gallery-stat-group">
            <StatRow label="Zones" value={24} />
            <StatRow label="Cards" value={19} />
          </div>
          <div className="gallery-stat-group">
            <StatRow label="Stations" value={37} />
            <StatRow label="Tier" value="High" />
            <StatRow label="Status" value="Open" />
          </div>
        </div>
      </PreviewSection>

      <PreviewSection id="gallery-c11" title="C11 · SectionHeader">
        <SectionHeader level={2}>Nearest police station</SectionHeader>
      </PreviewSection>

      <PreviewSection id="gallery-c12" title="C12 · EmptyState">
        <div className="gallery-grid">
          <PreviewCell className="gallery-empty-frame" label="without action">
            <EmptyState body="No favourites have been added yet." icon="group" title="No favourites" />
          </PreviewCell>
          <PreviewCell className="gallery-empty-frame" label="with Ghost action">
            <EmptyState
              action={{ label: "Add favourite", onClick: noop, workingLabel: "Working" }}
              body="Add someone you trust before you need them."
              icon="group"
              title="No favourites"
            />
          </PreviewCell>
        </div>
      </PreviewSection>

      <PreviewSection id="gallery-c13" title="C13 · MapControlButton">
        <div className="gallery-grid">
          <PreviewCell className="gallery-map-control-frame" label="single">
            <MapControlButton icon="my_location" label="Centre my location" onClick={noop} />
          </PreviewCell>
          <PreviewCell className="gallery-map-control-frame" label="right stack">
            <MapControlButtonStack>
              <MapControlButton icon="my_location" label="Centre my location" onClick={noop} />
              <MapControlButton icon="sos" label="Start SOS" onClick={noop} />
              <MapControlButton icon="settings" label="Settings" onClick={noop} />
            </MapControlButtonStack>
          </PreviewCell>
        </div>
      </PreviewSection>

      <PreviewSection id="gallery-c14" title="C14 · ArmBanner">
        <div className="gallery-grid">
          <PreviewCell className="gallery-arm-frame gallery-arm-frame--entry" label="entering · frozen">
            <ArmBanner body={ARM_BANNER_BODY} onAutoHide={noop} title="Saaya woke by itself" />
          </PreviewCell>
          <PreviewCell className="gallery-arm-frame gallery-arm-frame--visible" label="visible">
            <ArmBanner body={ARM_BANNER_BODY} onAutoHide={noop} title="Saaya woke by itself" />
          </PreviewCell>
          <PreviewCell className="gallery-arm-frame gallery-arm-frame--hiding" label="auto-hide · frozen">
            <ArmBanner body={ARM_BANNER_BODY} onAutoHide={noop} title="Saaya woke by itself" />
          </PreviewCell>
          <PreviewCell className="gallery-arm-persistent" label="persistent bottom-sheet copy">
            <strong>Saaya woke by itself</strong>
            <span>{ARM_BANNER_BODY}</span>
          </PreviewCell>
        </div>
      </PreviewSection>

      <style jsx global>{`
        .component-gallery {
          display: flex;
          flex-direction: column;
          gap: var(--space-48);
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: structural full-viewport gallery shell */
          padding: var(--screen-padding);
          background: var(--color-background);
          color: var(--color-text-primary);
        }

        .gallery-header,
        .gallery-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-16);
        }

        .gallery-header h1,
        .gallery-header p,
        .gallery-section h2,
        .gallery-cell h3 {
          margin: 0;
        }

        .gallery-header h1 {
          font-size: var(--type-title-size);
          font-weight: var(--weight-bold);
          line-height: var(--type-title-line-height);
        }

        .gallery-header p {
          color: var(--color-text-secondary);
        }

        .gallery-header .gallery-kicker,
        .gallery-cell__label {
          color: var(--color-text-secondary);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
          text-transform: uppercase;
        }

        .gallery-section > h2 {
          font-size: var(--type-headline-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-headline-line-height);
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(min(100%, var(--viewport-floor)), 1fr) /* GROUNDED-EXEMPT: percentage and fraction are structural responsive-grid geometry */
          );
          gap: var(--space-16);
        }

        .gallery-grid--wide {
          align-items: stretch;
        }

        .gallery-cell {
          position: relative;
          display: flex;
          min-inline-size: 0;
          flex-direction: column;
          gap: var(--space-12);
          padding: var(--space-16);
          overflow: hidden;
          border: 1px solid var(--color-surface-elevated);
          border-radius: var(--radius-control);
          background: var(--color-surface);
        }

        .gallery-inline-row,
        .gallery-stat-group {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-12);
        }

        .gallery-stack {
          display: flex;
          flex-direction: column;
          gap: var(--space-16);
        }

        .gallery-force-pressed .saaya-button__surface,
        .gallery-force-pressed .big-action-button__surface {
          transform: scale(0.97);
        }

        .gallery-force-pressed.saaya-button--primary .saaya-button__surface {
          background: var(--color-brand-dark);
        }

        .gallery-force-pressed.saaya-button--accent .saaya-button__surface,
        .gallery-force-pressed.saaya-button--destructive .saaya-button__surface {
          background: color-mix(
            in srgb,
            black 8%,
            var(--saaya-button-fill)
          );
        }

        .gallery-force-pressed.big-action-button .big-action-button__surface {
          background: color-mix(
            in srgb,
            black 8%,
            var(--big-action-button-fill)
          );
        }

        .gallery-force-focused .saaya-button__surface,
        .gallery-force-focused .big-action-button__surface {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }

        .gallery-ladder-frame {
          position: relative;
          min-block-size: calc(var(--viewport-floor) + var(--sheet-peek-height));
          overflow: hidden;
          border-radius: var(--radius-control);
        }

        .gallery-ladder-frame .ladder-card {
          position: absolute;
        }

        .gallery-ladder-frame[data-phase="entering"] .ladder-card__surface {
          animation-delay: calc(var(--motion-320) / -2) !important; /* GROUNDED-EXEMPT: dev-gallery freeze at the animation midpoint */
          animation-play-state: paused !important;
        }

        .gallery-ladder-frame[data-phase="entering"] .ladder-card__scrim {
          animation-delay: calc(var(--motion-180) / -2) !important; /* GROUNDED-EXEMPT: dev-gallery freeze at the animation midpoint */
          animation-play-state: paused !important;
        }

        .gallery-ladder-frame[data-phase="answered"] .ladder-card__surface {
          animation-delay: calc(var(--motion-160) / -2) !important; /* GROUNDED-EXEMPT: dev-gallery freeze at the animation midpoint */
          animation-play-state: paused !important;
        }

        .gallery-removed-state {
          margin: auto;
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
          text-align: center;
        }

        .gallery-status-frame {
          min-block-size: var(--minimum-touch-target);
        }

        .gallery-status-frame .status-pill {
          inset-block-start: 0;
        }

        .gallery-sheet-frame {
          position: relative;
          block-size: calc(var(--sheet-peek-height) * 2); /* GROUNDED-EXEMPT: isolated gallery frame holds one expanded sheet and one exact peek */
          overflow: hidden;
          border-radius: var(--radius-card);
        }

        .gallery-sheet-frame .saaya-bottom-sheet {
          position: absolute;
          block-size: calc(var(--sheet-peek-height) * 2); /* GROUNDED-EXEMPT: gallery isolation override, not product sheet geometry */
        }

        .gallery-sheet-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
          padding: var(--space-48) var(--space-20) var(--space-20);
        }

        .gallery-pin-active .pin-entry__box[data-current="true"] {
          border-color: var(--color-brand);
        }

        .gallery-empty-frame {
          min-block-size: var(--sheet-peek-height);
        }

        .gallery-map-control-frame {
          align-items: flex-end;
        }

        .gallery-arm-frame .arm-banner {
          margin: 0;
        }

        .gallery-arm-frame--entry .arm-banner {
          animation: none !important;
        }

        .gallery-arm-frame--entry .arm-banner__surface {
          animation-delay: calc(var(--motion-300) / -2) !important; /* GROUNDED-EXEMPT: dev-gallery freeze at the animation midpoint */
          animation-play-state: paused !important;
        }

        .gallery-arm-frame--visible .arm-banner,
        .gallery-arm-frame--visible .arm-banner__surface,
        .gallery-arm-frame--hiding .arm-banner__surface {
          animation: none !important;
        }

        .gallery-arm-frame--hiding .arm-banner {
          animation-delay: calc(var(--motion-200) / -2) !important; /* GROUNDED-EXEMPT: dev-gallery freeze at the animation midpoint */
          animation-play-state: paused !important;
        }

        .gallery-arm-persistent {
          border-radius: var(--radius-card);
          background: var(--color-card-fill);
          color: var(--color-text-on-card);
        }
      `}</style>
    </main>
  );
}
