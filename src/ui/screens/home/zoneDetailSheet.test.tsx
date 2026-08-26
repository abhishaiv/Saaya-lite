import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bundledZoneRepository } from "../../../data/repository/zoneRepository";
import { M4_COPY } from "../../copy/strings";
import { ZoneDetailSheet } from "./ZoneDetailSheet";

describe("M4 zone detail sheet", () => {
  const snapshot = bundledZoneRepository.snapshot();
  const english = M4_COPY.en;
  const telugu = M4_COPY.te;
  const highRiskDetail = snapshot.zoneDetails.find(
    ({ id }) => id === "dwaraka_police_station",
  );
  const safeDetail = snapshot.zoneDetails.find(({ card }) => card === null);
  const firstStation = snapshot.policeStations[0];

  if (highRiskDetail === undefined || safeDetail === undefined) {
    throw new Error("Bundled zone detail fixtures are incomplete");
  }

  it("opens expanded with static card risk and a separately modulated display band", () => {
    const html = renderToStaticMarkup(
      <ZoneDetailSheet
        copy={english}
        currentPoint={{
          latitude: firstStation.latitude,
          longitude: firstStation.longitude,
        }}
        detail={highRiskDetail}
        hourBand="DAY"
        onDismiss={() => undefined}
        policeStations={snapshot.policeStations}
      />,
    );

    expect(html).toContain('data-position="expanded"');
    expect(html).toContain(highRiskDetail.card?.riskLevel);
    expect(highRiskDetail.card?.riskLevel).toBe("High Risk");
    expect(html).toContain(english.riskBandElevated);
    expect(html).toContain(english.zoneStatIncidents);
    expect(html).toContain(english.zoneStatWomen);
    expect(html.replaceAll("&amp;", "&")).toContain(
      highRiskDetail.card?.topCrimes,
    );
  });

  it("renders the nearest station, selectable number, tel handoff, and approximation note", () => {
    const html = renderToStaticMarkup(
      <ZoneDetailSheet
        copy={english}
        currentPoint={{
          latitude: firstStation.latitude,
          longitude: firstStation.longitude,
        }}
        detail={highRiskDetail}
        hourBand="NIGHT_DEEP"
        onDismiss={() => undefined}
        policeStations={snapshot.policeStations}
      />,
    );

    expect(html).toContain(firstStation.name);
    expect(html).toContain(firstStation.phone);
    expect(html).toContain(`href="tel:${firstStation.phone}"`);
    expect(html).toContain(english.ctaCall);
    expect(html).toContain(english.zoneStationApprox);
  });

  it("keeps the SAFE state honest without fabricating a missing card", () => {
    const html = renderToStaticMarkup(
      <ZoneDetailSheet
        copy={telugu}
        currentPoint={null}
        detail={safeDetail}
        hourBand="DAY"
        onDismiss={() => undefined}
        policeStations={snapshot.policeStations}
      />,
    );

    expect(html).toContain(telugu.zoneSafeNoData);
    expect(html).toContain(telugu.locSearching);
    expect(html).not.toContain(telugu.zoneStatIncidents);
  });

  it("drops the station block when all stations are outside the range", () => {
    const html = renderToStaticMarkup(
      <ZoneDetailSheet
        copy={english}
        currentPoint={{ latitude: 0, longitude: 0 }}
        detail={highRiskDetail}
        hourBand="DAY"
        onDismiss={() => undefined}
        policeStations={snapshot.policeStations}
      />,
    );

    expect(html).toContain(english.errNoStation);
    expect(html).not.toContain('href="tel:');
  });
});
