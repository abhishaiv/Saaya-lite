import { describe, expect, it } from "vitest";

import {
  DEMO_ARM_HOUR,
  DEMO_ARM_TIME,
  hourBandForLocalTime,
} from "../../../domain/engine/rules";
import { startDemoEventSequence } from "./demoControls";

describe("M4 demo engine controls", () => {
  it("derives the simulated zone-entry band from the single frozen demo hour", () => {
    expect(DEMO_ARM_HOUR).toBe(4); // fact: demo.arm.hour
    expect(DEMO_ARM_TIME.hourBand).toBe(
      hourBandForLocalTime(DEMO_ARM_HOUR, 0),
    );
    expect(DEMO_ARM_TIME.hourBand).toBe("NIGHT_DEEP");
    expect(DEMO_ARM_TIME.hourOfDay).toBe(DEMO_ARM_HOUR);
  });

  it("reduces Start Demo to exactly the two shared-engine arming events", () => {
    const sequence = startDemoEventSequence("zone-station-1");

    expect(sequence).toEqual([
      { kind: "ZoneEntered", zoneId: "zone-station-1" },
      { kind: "CheckInTimerFired" },
    ]);
    expect(sequence).toHaveLength(2);
  });

  it("carries the chosen zone id into the simulated entry and nothing else", () => {
    const sequence = startDemoEventSequence("another-zone");

    expect(sequence[0]).toEqual({ kind: "ZoneEntered", zoneId: "another-zone" });
    expect(sequence[1]).toEqual({ kind: "CheckInTimerFired" });
    expect(
      sequence.filter((event) => event.kind === "ZoneEntered"),
    ).toHaveLength(1);
  });
});