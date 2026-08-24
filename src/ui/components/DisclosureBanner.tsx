export type DisclosureKind = "mock" | "prototype-limitation";

export type DisclosureBannerProps = Readonly<{
  className?: string;
  content: string;
  kind: DisclosureKind;
}>;

const INFO_GLYPH = "\uE88E";

/** C7 disclosure treatment for mocks and prototype limitations. */
export function DisclosureBanner({
  className,
  content,
  kind,
}: DisclosureBannerProps) {
  const classes = ["disclosure-banner", className].filter(Boolean).join(" ");

  return (
    <>
      <div
        className={classes}
        data-disclosure-kind={kind}
        role="note"
      >
        <span aria-hidden="true" className="disclosure-banner__icon">
          {INFO_GLYPH}
        </span>
        <span className="disclosure-banner__content">{content}</span>
      </div>

      <style jsx>{`
        .disclosure-banner {
          box-sizing: border-box;
          display: flex;
          align-items: flex-start;
          inline-size: calc(100% - (var(--screen-padding) * 2)); /* GROUNDED-EXEMPT: CSS full-width basis, not a product value. */
          margin-inline: var(--screen-padding);
          padding: var(--space-14);
          border-inline-start: 3px solid var(--color-amber);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          color: var(--color-text-on-card);
          font-family: inherit;
          font-size: var(--type-caption-size);
          font-weight: var(--weight-regular);
          line-height: var(--type-caption-line-height);
        }

        .disclosure-banner__icon {
          display: inline-block;
          flex: 0 0 20px;
          inline-size: 20px;
          block-size: 20px;
          color: var(--color-amber);
          font-family: "Material Symbols Rounded";
          font-size: 20px;
          font-style: normal;
          font-weight: normal;
          font-variation-settings:
            "FILL" 1,
            "wght" 400,
            "GRAD" 0,
            "opsz" 20;
          line-height: 20px;
          text-align: start;
          text-transform: none;
          white-space: nowrap;
          direction: ltr;
          user-select: none;
        }

        .disclosure-banner__content {
          min-inline-size: 0;
        }
      `}</style>
    </>
  );
}
