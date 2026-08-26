import type { CSSProperties } from "react";

import { RiskTier, type Zone } from "../../domain/model/zone";

export type ZoneChipProps = Readonly<
  Pick<Zone, "riskTier" | "colorHex"> & {
    className?: string;
    /** Frozen display label, when the asset supplies one. */
    label?: string;
  }
>;

/** C6 tier badge, using the audited zone colour supplied by the domain model. */
export function ZoneChip({
  className,
  colorHex,
  label,
  riskTier,
}: ZoneChipProps) {
  const classes = ["zone-chip", className].filter(Boolean).join(" ");
  const style = {
    "--zone-chip-color":
      riskTier === RiskTier.SAFE
        ? "var(--color-text-secondary)"
        : colorHex,
  } as CSSProperties;

  return (
    <>
      <span className={classes} data-tier={riskTier} style={style}>
        {label ?? riskTier}
      </span>

      <style jsx>{`
        .zone-chip {
          box-sizing: border-box;
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          block-size: 24px; /* dim.chip.height */
          padding: 0 10px; /* dim.chip.padding.horizontal */
          border: 1px solid var(--zone-chip-color); /* dim.border.hairline */
          border-radius: var(--radius-small);
          background: color-mix(
            in srgb,
            var(--zone-chip-color) 20%,
            transparent
          ); /* alpha.chip.fill */
          color: var(--zone-chip-color);
          font-family: inherit;
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
          white-space: nowrap;
        }
      `}</style>
    </>
  );
}
