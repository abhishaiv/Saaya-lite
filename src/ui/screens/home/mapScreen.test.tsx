import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bundledZoneRepository } from "../../../data/repository/zoneRepository";
import { HomeMap } from "./HomeMap";
import { projectMapHotspots } from "./mapProjection";

const MAP_COPY = {
  ariaMap: "Map of Visakhapatnam risk areas",
  ariaZone: (area: string, tier: string) => `${area}, ${tier}`,
  attribution: "© OpenStreetMap contributors",
  offline: "Map offline, zones still work",
};

describe("M4 localized hotspot map", () => {
  const snapshot = bundledZoneRepository.snapshot();

  it("joins the localized source to non-SAFE parent localities and keeps all demo zones", () => {
    expect(snapshot.mapZones).toHaveLength(19); // fact: zones.drawn
    expect(snapshot.heatmapHotspots).toHaveLength(70); // fact: heatmap.points.visible
    expect(snapshot.demoZones).toHaveLength(24); // fact: zones.total
    expect(snapshot.zoneDetails).toHaveLength(24); // fact: zones.total
    expect(snapshot.policeStations).toHaveLength(37); // fact: stations.total
    expect(snapshot.zoneDetails.filter(({ card }) => card === null)).toHaveLength(5); // fact: zones.safe
    expect(
      snapshot.heatmapHotspots.every(({ zone }) => zone.riskTier !== "SAFE"),
    ).toBe(true);
    expect(new Set(snapshot.heatmapHotspots.map(({ zone }) => zone.colorHex))).toEqual(
      new Set(["#FF3B30", "#FF9500", "#FFCC00"]),
    );
  });

  it("precomputes one stable localized circle per visible hotspot", () => {
    const first = projectMapHotspots(
      snapshot.mapZones,
      snapshot.heatmapHotspots,
    );
    const second = projectMapHotspots(
      snapshot.mapZones,
      snapshot.heatmapHotspots,
    );
    expect(first).toHaveLength(70); // fact: heatmap.points.visible
    expect(second).toEqual(first);
    expect(first.every(({ radius }) => radius > 0)).toBe(true);
  });

  it("uses localized circle bounds, not historical polygon bounds, for the fallback viewport", () => {
    const polygonlessMapZones = snapshot.mapZones.map((mapZone) => ({
      ...mapZone,
      zone: { ...mapZone.zone, polygon: [] },
    }));
    expect(
      projectMapHotspots(polygonlessMapZones, snapshot.heatmapHotspots),
    ).toEqual(
      projectMapHotspots(snapshot.mapZones, snapshot.heatmapHotspots),
    );
  });

  it("server-renders translucent circles and attribution without waiting for tiles", () => {
    const html = renderToStaticMarkup(
      <HomeMap
        copy={MAP_COPY}
        hotspots={snapshot.heatmapHotspots}
        location={null}
        mapZones={snapshot.mapZones}
        onController={() => undefined}
        onTileAvailability={() => undefined}
        onZoneSelected={() => undefined}
        selectedZoneId={null}
        sessionState="IDLE"
        tileAvailability="offline"
      />,
    );
    expect(html.match(/data-hotspot-id=/g)).toHaveLength(70); // fact: heatmap.points.visible
    expect(html).toContain("© OpenStreetMap contributors");
    expect(html).toContain('data-hotspot-treatment="base"');
    expect(html).not.toContain('data-hotspot-treatment="selected"');
    expect(html).not.toContain("home-map__fallback-label");
    expect(html).not.toContain("<path");
    expect(html).not.toContain('fill-opacity="0"');
    expect(html).toContain("Map offline, zones still work");
    expect(html).toMatch(/font-size:\s*calc\(10 \/ 16 \* 1rem\)/); // facts: type.map.attribution, type.rem.base
  });

  it("highlights every circle owned by the selected parent locality", () => {
    const selectedHotspot = snapshot.heatmapHotspots[0];
    if (selectedHotspot === undefined) throw new Error("Frozen hotspots are missing");
    const selectedCount = snapshot.heatmapHotspots.filter(
      ({ zone }) => zone.stationId === selectedHotspot.zone.stationId,
    ).length;
    const html = renderToStaticMarkup(
      <HomeMap
        copy={MAP_COPY}
        hotspots={snapshot.heatmapHotspots}
        location={null}
        mapZones={snapshot.mapZones}
        onController={() => undefined}
        onTileAvailability={() => undefined}
        onZoneSelected={() => undefined}
        selectedZoneId={selectedHotspot.zone.stationId}
        sessionState="IDLE"
        tileAvailability="online"
      />,
    );
    expect(html.match(/data-hotspot-treatment="selected"/g)).toHaveLength(
      selectedCount,
    );
    expect(html.match(/data-hotspot-treatment="base"/g)).toHaveLength(
      snapshot.heatmapHotspots.length - selectedCount,
    );
    expect(html).toContain('stroke-width="6"'); // fact: map.zone.glow
    expect(html).toContain('stroke-width="3"'); // fact: map.zone.stroke.sel
  });
});
