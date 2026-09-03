import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bundledZoneRepository } from "../../../data/repository/zoneRepository";
import {
  DEMO_DIVISOR,
  DEMO_TOTAL_SEC,
  LADDER_TOTAL_SEC,
  NORMAL_DEMO_DIVISOR,
} from "../../../domain/engine/rules";
import { formatCopy, M4_COPY } from "../../copy/strings";
import { DemoPanel } from "./DemoPanel";

function render(
  locale: keyof typeof M4_COPY,
  enabled: boolean,
  sessionState: "IDLE" | "SHADOW" = "IDLE",
) {
  return renderToStaticMarkup(
    <DemoPanel
      copy={M4_COPY[locale]}
      demoSpeedEnabled={enabled}
      demoZones={bundledZoneRepository.snapshot().demoZones}
      onClose={() => undefined}
      onDemoSpeedChanged={() => undefined}
      onJumpFamily={() => undefined}
      onMissCheckIn={() => undefined}
      onReset={() => undefined}
      onTriggerSos={() => undefined}
      onZoneSelected={() => undefined}
      sessionState={sessionState}
    />,
  );
}

describe("M4 bilingual demo panel", () => {
  it("labels the controls as prototype-only and lists every frozen zone", () => {
    const html = render("en", true);
    const { demoZones } = bundledZoneRepository.snapshot();

    expect(html).toContain(M4_COPY.en.demoPanelHeader);
    expect(html).toContain(M4_COPY.en.demoPickZoneHint);
    expect(html.match(/<option/g)).toHaveLength(demoZones.length + 1); // GROUNDED-EXEMPT: the select has one structural prompt in addition to every frozen zone.
    for (const zone of demoZones) expect(html).toContain(zone.label);
  });

  it("formats the speed disclosure from the engine constants in both languages", () => {
    for (const locale of ["en", "te"] as const) {
      const html = render(locale, true);
      expect(html).toContain(
        formatCopy(
          M4_COPY[locale].demoSpeedNoteFast,
          DEMO_DIVISOR,
          DEMO_TOTAL_SEC,
          LADDER_TOTAL_SEC,
        ),
      );
      expect(html).toContain(M4_COPY[locale].demoTriggerSos);
      expect(html).toContain(M4_COPY[locale].demoReset);
    }
  });

  it("keeps simulation controls unavailable until the labelled demo mode is on", () => {
    for (const locale of ["en", "te"] as const) {
      const html = render(locale, false);

      expect(html).toContain(
        formatCopy(
          M4_COPY[locale].demoSpeedNoteNormal,
          NORMAL_DEMO_DIVISOR,
          LADDER_TOTAL_SEC,
          LADDER_TOTAL_SEC,
        ),
      );
      expect(M4_COPY[locale].demoSpeedNoteNormal).not.toContain("%2$d");
      expect(html).toContain('role="switch"');
      expect(html).toContain("disabled");
      expect(html).toContain(M4_COPY[locale].demoMissCheckin);
    }
  });

  it("explains disabled simulation controls during a live session in both languages", () => {
    for (const locale of ["en", "te"] as const) {
      const html = render(locale, true, "SHADOW");
      const switchMarkup = html.match(/<input[^>]*role="switch"[^>]*>/)?.[0];

      expect(html).toContain(M4_COPY[locale].demoSessionLiveReason);
      expect(html).toContain('role="status"');
      expect(html).toContain("disabled");
      expect(switchMarkup).toBeDefined();
      expect(switchMarkup).not.toContain("disabled");
    }
  });
});
