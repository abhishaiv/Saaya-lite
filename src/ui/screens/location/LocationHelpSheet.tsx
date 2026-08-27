"use client";

import { useEffect, useState } from "react";

import { subscribeBottomSheetDragRange } from "../../../platform/viewportMetrics";
import { SaayaBottomSheet } from "../../components/SaayaBottomSheet";
import { SaayaButton } from "../../components/SaayaButton";
import type { M4Copy } from "../../copy/strings";

export interface LocationHelpSheetProps {
  readonly copy: M4Copy;
  readonly onDismiss: () => void;
  readonly onRetry: () => void;
}

/** S11b: the one honest recovery surface shared by Home and onboarding. */
export function LocationHelpSheet({
  copy,
  onDismiss,
  onRetry,
}: LocationHelpSheetProps) {
  const [dragRangePx, setDragRangePx] = useState(0);

  useEffect(() => subscribeBottomSheetDragRange(setDragRangePx), []);

  return (
    <SaayaBottomSheet
      ariaLabel={copy.locHelpTitle}
      className="location-help-sheet"
      dragRangePx={dragRangePx}
      onDismiss={onDismiss}
      onPositionChange={(position) => {
        if (position === "peek") onDismiss();
      }}
      position="expanded"
    >
      <section aria-labelledby="location-help-title" className="location-help">
        <div className="location-help__copy">
          <h2 id="location-help-title">{copy.locHelpTitle}</h2>
          <p>{copy.locHelpBody}</p>
          <p className="location-help__note">{copy.locHelpNote}</p>
        </div>

        <SaayaButton
          onClick={onRetry}
          variant="primary"
          workingLabel={copy.stateWorking}
        >
          {copy.ctaRetry}
        </SaayaButton>
      </section>

      <style jsx>{`
        .location-help {
          display: flex;
          min-block-size: 100%; /* GROUNDED-EXEMPT: content fills the recovery sheet. */
          flex-direction: column;
          justify-content: space-between;
          gap: var(--space-24);
          padding: var(--space-48) var(--screen-padding)
            calc(var(--space-20) + env(safe-area-inset-bottom));
        }

        .location-help__copy {
          display: grid;
          gap: var(--space-12);
        }

        .location-help h2,
        .location-help p {
          margin: 0;
        }

        .location-help h2 {
          font-size: var(--type-card-title-size);
          line-height: var(--type-card-title-line-height);
        }

        .location-help p {
          color: var(--color-text-on-card);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }

        .location-help .location-help__note {
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }
      `}</style>
    </SaayaBottomSheet>
  );
}
