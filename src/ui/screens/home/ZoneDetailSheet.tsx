"use client";

import { useEffect, useMemo, useState } from "react";

import type { ZoneDetail } from "../../../data/repository/zoneRepository";
import {
  displayRisk,
  displayRiskLabel,
} from "../../../domain/engine/rules";
import {
  nearestStation,
  stationDistanceDisplay,
} from "../../../domain/engine/nearestStation";
import type { HourBand } from "../../../domain/model/session";
import type { PoliceStation } from "../../../domain/model/policeStation";
import type { LatLng } from "../../../domain/model/zone";
import {
  subscribeBottomSheetDragRange,
} from "../../../platform/viewportMetrics";
import { SaayaBottomSheet } from "../../components/SaayaBottomSheet";
import { StatRow } from "../../components/StatRow";
import { ZoneChip } from "../../components/ZoneChip";
import { formatCopy, type M4Copy } from "../../copy/strings";
import { MaterialSymbol } from "../../icons/MaterialSymbol";

export interface ZoneDetailSheetProps {
  readonly copy: M4Copy;
  readonly currentPoint: LatLng | null;
  readonly detail: ZoneDetail;
  readonly hourBand: HourBand;
  readonly onDismiss: () => void;
  readonly policeStations: readonly PoliceStation[];
}

function localizedRiskBand(
  copy: M4Copy,
  label: ReturnType<typeof displayRiskLabel>,
): string {
  switch (label) {
    case "Low":
      return copy.riskBandLow;
    case "Moderate":
      return copy.riskBandModerate;
    case "Elevated":
      return copy.riskBandElevated;
    case "High":
      return copy.riskBandHigh;
  }
}

export function ZoneDetailSheet({
  copy,
  currentPoint,
  detail,
  hourBand,
  onDismiss,
  policeStations,
}: ZoneDetailSheetProps) {
  const [dragRangePx, setDragRangePx] = useState(0);
  const stationDistance = useMemo(
    () =>
      currentPoint === null
        ? undefined
        : nearestStation(currentPoint, policeStations),
    [currentPoint, policeStations],
  );

  useEffect(
    () => subscribeBottomSheetDragRange(setDragRangePx),
    [],
  );

  const card = detail.card;
  const riskBand = localizedRiskBand(
    copy,
    displayRiskLabel(displayRisk(detail.zone.riskScore, hourBand)),
  );

  return (
    <SaayaBottomSheet
      ariaLabel={copy.cdCloseSheet}
      className="zone-detail-sheet"
      dragRangePx={dragRangePx}
      onDismiss={onDismiss}
      onPositionChange={onDismiss}
      position="expanded"
    >
      <article aria-labelledby="zone-detail-title" className="zone-detail">
        <header className="zone-detail__header">
          <div>
            <h2 id="zone-detail-title">{detail.label}</h2>
            {card === null ? null : (
              <ZoneChip
                colorHex={detail.zone.colorHex}
                label={card.riskLevel}
                riskTier={detail.zone.riskTier}
              />
            )}
          </div>

          <button
            aria-label={copy.cdCloseSheet}
            className="zone-detail__close"
            onClick={onDismiss}
            type="button"
          >
            <MaterialSymbol decorative fill="utility" name="close" size={24} />
          </button>
        </header>

        {card === null ? (
          <p className="zone-detail__safe-note">{copy.zoneSafeNoData}</p>
        ) : (
          <>
            <div className="zone-detail__stats">
              <StatRow
                label={copy.zoneStatIncidents}
                value={card.incidentCount}
              />
              <StatRow
                label={copy.zoneStatWomen}
                value={card.womenSafetyCount}
              />
            </div>

            <p className="zone-detail__hour-risk">
              {formatCopy(copy.homeHourContext, detail.label, riskBand)}
            </p>

            <section className="zone-detail__section">
              <h3>{copy.zoneTopCrimes}</h3>
              <p>{card.topCrimes}</p>
              <p className="zone-detail__notes">{card.riskNotes}</p>
            </section>
          </>
        )}

        {stationDistance === undefined ? (
          <section className="zone-detail__section">
            <h3>{copy.zoneStation}</h3>
            <p>{copy.locSearching}</p>
          </section>
        ) : stationDistance === null ? (
          <p className="zone-detail__no-station">{copy.errNoStation}</p>
        ) : (
          <StationBlock copy={copy} stationDistance={stationDistance} />
        )}

        <footer>{copy.zoneDataSource}</footer>
      </article>

      <style jsx>{`
        .zone-detail {
          display: flex;
          flex-direction: column;
          gap: var(--space-16);
          min-block-size: 100%; /* GROUNDED-EXEMPT: content fills the sheet surface. */
          padding: var(--space-40) var(--screen-padding)
            calc(var(--space-24) + env(safe-area-inset-bottom));
          color: var(--color-text-primary);
        }

        .zone-detail__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-12);
        }

        .zone-detail__header h2 {
          margin: 0 0 var(--space-8);
          font-size: var(--type-card-title-size);
          font-weight: var(--weight-bold);
          line-height: var(--type-card-title-line-height);
        }

        .zone-detail__close {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          inline-size: var(--minimum-touch-target);
          block-size: var(--minimum-touch-target);
          margin: calc(var(--space-8) * -1);
          padding: 0;
          border: 0;
          border-radius: var(--radius-small);
          background: transparent;
          color: var(--color-text-secondary);
          cursor: pointer;
        }

        .zone-detail__close:focus-visible {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }

        .zone-detail__stats {
          display: flex;
          gap: var(--space-20);
          padding: var(--space-14);
          border-radius: var(--radius-control);
          background: rgb(from var(--color-text-primary) r g b / 0.06);
        }

        .zone-detail__hour-risk,
        .zone-detail__safe-note,
        .zone-detail__no-station {
          margin: 0;
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }

        .zone-detail__safe-note,
        .zone-detail__no-station {
          padding: var(--space-14);
          border-radius: var(--radius-control);
          background: rgb(from var(--color-amber) r g b / 0.1);
          color: var(--color-text-on-card);
        }

        .zone-detail__section {
          display: grid;
          gap: var(--space-6);
        }

        .zone-detail__section h3,
        .zone-detail__section p {
          margin: 0;
        }

        .zone-detail__section h3 {
          color: var(--color-text-secondary);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
        }

        .zone-detail__section p {
          font-size: var(--type-card-body-size);
          line-height: var(--type-card-body-line-height);
        }

        .zone-detail__notes {
          color: var(--color-text-on-card);
        }

        .zone-detail footer {
          margin-block-start: auto;
          color: var(--color-text-tertiary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }
      `}</style>
    </SaayaBottomSheet>
  );
}

type StationBlockProps = Readonly<{
  copy: M4Copy;
  stationDistance: NonNullable<ReturnType<typeof nearestStation>>;
}>;

function StationBlock({ copy, stationDistance }: StationBlockProps) {
  const distance = stationDistanceDisplay(stationDistance.distanceM);
  const distanceCopy = formatCopy(
    distance.unit === "m" ? copy.zoneDistanceM : copy.zoneDistanceKm,
    distance.value,
  );
  const { station } = stationDistance;

  return (
    <section className="station-block">
      <h3>{copy.zoneStation}</h3>
      <div className="station-block__row">
        <div className="station-block__identity">
          <strong>{station.name}</strong>
          <span>{distanceCopy}</span>
          <span className="station-block__phone">{station.phone}</span>
        </div>

        <a
          aria-label={formatCopy(copy.cdStationCall, station.name)}
          className="station-block__call"
          href={`tel:${station.phone}`}
        >
          <MaterialSymbol decorative fill="utility" name="call" size={20} />
          <span>{copy.ctaCall}</span>
        </a>
      </div>

      {station.coordPrecision === "locality-approx" ? (
        <p className="station-block__approx">{copy.zoneStationApprox}</p>
      ) : null}

      <style jsx>{`
        .station-block {
          display: grid;
          gap: var(--space-8);
        }

        .station-block h3,
        .station-block p {
          margin: 0;
        }

        .station-block h3 {
          color: var(--color-text-secondary);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
        }

        .station-block__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-12);
          padding: var(--space-14);
          border-radius: var(--radius-control);
          background: rgb(from var(--color-text-primary) r g b / 0.06);
        }

        .station-block__identity {
          display: grid;
          min-inline-size: 0;
          gap: var(--space-4);
        }

        .station-block__identity strong {
          font-size: var(--type-card-body-size);
          line-height: var(--type-card-body-line-height);
        }

        .station-block__identity span {
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .station-block__phone {
          color: var(--color-text-primary) !important;
          user-select: text;
        }

        .station-block__call {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          gap: var(--space-6);
          min-block-size: var(--minimum-touch-target);
          padding: 0 var(--space-14);
          border-radius: var(--radius-control);
          background: var(--color-brand);
          color: var(--color-text-primary);
          font-size: var(--type-card-body-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-card-body-line-height);
          text-decoration: none;
        }

        .station-block__call:focus-visible {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }

        .station-block__approx {
          color: var(--color-text-tertiary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }
      `}</style>
    </section>
  );
}
