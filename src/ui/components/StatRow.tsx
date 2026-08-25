export type StatRowProps = Readonly<{
  className?: string;
  label: string;
  value: string | number;
}>;

/** C10 semantic term-and-value pair for zone and police statistics. */
export function StatRow({ className, label, value }: StatRowProps) {
  const classes = ["stat-row", className].filter(Boolean).join(" ");

  return (
    <>
      <dl className={classes}>
        <dt className="stat-row__label">{label}</dt>
        <dd className="stat-row__value">{value}</dd>
      </dl>

      <style jsx>{`
        .stat-row {
          flex: 1 1 0;
          min-inline-size: 0;
          margin: 0;
        }

        .stat-row__label {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
          text-transform: uppercase;
        }

        .stat-row__value {
          margin: 0;
          font-feature-settings: var(--font-feature-numerals);
          font-size: var(--type-headline-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-headline-line-height);
        }
      `}</style>
    </>
  );
}
