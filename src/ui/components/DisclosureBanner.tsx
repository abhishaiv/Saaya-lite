import { MaterialSymbol } from "../icons/MaterialSymbol";

export type DisclosureKind = "mock" | "prototype-limitation";

export type DisclosureBannerProps = Readonly<{
  className?: string;
  content: string;
  kind: DisclosureKind;
}>;

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
          <MaterialSymbol
            decorative
            fill="state"
            name="info"
            size={20}
          />
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
          display: inline-flex;
          flex: 0 0 20px;
          inline-size: 20px;
          block-size: 20px;
          align-items: center;
          justify-content: center;
          color: var(--color-amber);
        }

        .disclosure-banner__content {
          min-inline-size: 0;
        }
      `}</style>
    </>
  );
}
