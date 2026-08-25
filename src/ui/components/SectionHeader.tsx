import type { ReactNode } from "react";

export type SectionHeaderLevel = 1 | 2 | 3 | 4 | 5 | 6; // GROUNDED-EXEMPT: structural HTML heading levels, not product values

export type SectionHeaderProps = Readonly<{
  children: ReactNode;
  className?: string;
  id?: string;
  level: SectionHeaderLevel;
}>;

/** C11 localized section label with caller-selected heading semantics. */
export function SectionHeader({
  children,
  className,
  id,
  level,
}: SectionHeaderProps) {
  const Heading = `h${level}` as const;
  const classes = ["section-header", className].filter(Boolean).join(" ");

  return (
    <>
      <Heading className={classes} id={id}>
        {children}
      </Heading>

      <style jsx>{`
        .section-header {
          margin: 0;
          padding-block-start: var(--space-24);
          padding-block-end: var(--space-8);
          color: var(--color-text-secondary);
          font-family: inherit;
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
          text-transform: uppercase;
          animation: none;
          transition: none;
        }
      `}</style>
    </>
  );
}
