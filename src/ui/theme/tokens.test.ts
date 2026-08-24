import { describe, expect, it } from "vitest";

import { saayaTheme } from "./tokens";

describe("Saaya theme contract", () => {
  it("keeps the app background distinct from the icon ground", () => {
    expect(saayaTheme.colors.background).toBe("#0B0B0F");
    expect(saayaTheme.colors.background).not.toBe("#191230");
  });

  it("carries the complete frozen spacing scale", () => {
    expect(saayaTheme.spacing).toEqual([4, 8, 12, 14, 16, 20, 22, 24, 30, 32, 48]);
  });

  it("maps the design-system typography without adding a fourth weight", () => {
    expect(saayaTheme.type.weights).toEqual({ regular: 400, semibold: 600, bold: 700 });
    expect(saayaTheme.type.styles.headline.weight).toBe(600);
  });

  it("keeps escalation accents static and increasingly firm", () => {
    expect(saayaTheme.escalation.checkIn1.borderWidth).toBe(1);
    expect(saayaTheme.escalation.checkIn2.borderWidth).toBe(1.5);
    expect(saayaTheme.escalation.family.borderWidth).toBe(2);
  });
});
