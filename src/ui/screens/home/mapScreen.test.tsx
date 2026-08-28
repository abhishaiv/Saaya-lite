import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bundledZoneRepository } from "../../../data/repository/zoneRepository";
import { HomeMap } from "./HomeMap";
import { projectMapZones } from "./mapProjection";

describe("M4 bundled map", () => {
  const snapshot = bundledZoneRepository.snapshot();

  it("joins exactly the drawn polygons to locality labels and keeps all demo zones", () => {
    expect(snapshot.mapZones).toHaveLength(19); // fact: zones.drawn
    expect(snapshot.demoZones).toHaveLength(24); // fact: zones.total
    expect(snapshot.zoneDetails).toHaveLength(24); // fact: zones.total
    expect(snapshot.policeStations).toHaveLength(37); // fact: stations.total
    expect(snapshot.zoneDetails.filter(({ card }) => card === null)).toHaveLength(5); // fact: zones.safe
    expect(snapshot.mapZones.every(({ areaName }) => !areaName.includes("Police Station"))).toBe(true);
    expect(snapshot.mapZones.find(({ zone }) => zone.stationId === "ii_town_police_station")?.areaName).toBe("Soldierpet");
  });

  it("precomputes one stable path per drawn zone", () => {
    const first = projectMapZones(snapshot.mapZones);
    const second = projectMapZones(snapshot.mapZones);
    expect(first).toHaveLength(19); // fact: zones.drawn
    expect(second).toEqual(first);
    expect(first.every(({ path }) => path.startsWith("M") && path.endsWith("Z"))).toBe(true);
  });

  it("server-renders outline-first zones and full attribution without waiting for tiles", () => {
    const html = renderToStaticMarkup(
      <HomeMap
        copy={{
          ariaMap: "Map of Visakhapatnam risk areas",
          ariaZone: (area, tier) => `${area}, ${tier}`,
          attribution: "© OpenStreetMap contributors",
          offline: "Map offline, zones still work",
        }}
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
    expect(html.match(/data-zone-id=/g)).toHaveLength(19); // fact: zones.drawn
    expect(html).toContain("© OpenStreetMap contributors");
    expect(html).toContain('data-zone-treatment="outline"');
    expect(html).not.toContain('data-zone-treatment="selected"');
    expect(html).not.toContain('stroke-width="6"'); // fact: map.zone.glow
    expect(html).toContain('fill-opacity="0"');
    expect(html).toContain("Map offline, zones still work");
    expect(html).toMatch(/font-size:\s*calc\(10 \/ 16 \* 1rem\)/); // facts: type.map.attribution, type.rem.base
  });

  it("adds the existing fill, glow, and 3 px stroke only to the selected fallback zone", () => {
    const selectedZone = snapshot.mapZones[0];
    const html = renderToStaticMarkup(
      <HomeMap
        copy={{
          ariaMap: "Map of Visakhapatnam risk areas",
          ariaZone: (area, tier) => `${area}, ${tier}`,
          attribution: "© OpenStreetMap contributors",
          offline: "Map offline, zones still work",
        }}
        location={null}
        mapZones={snapshot.mapZones}
        onController={() => undefined}
        onTileAvailability={() => undefined}
        onZoneSelected={() => undefined}
        selectedZoneId={selectedZone.zone.stationId}
        sessionState="IDLE"
        tileAvailability="online"
      />,
    );
    expect(html.match(/data-zone-treatment="selected"/g)).toHaveLength(1);
    expect(html.match(/data-zone-treatment="outline"/g)).toHaveLength(
      snapshot.mapZones.length - 1,
    );
    expect(html).toContain('stroke-width="6"'); // fact: map.zone.glow
    expect(html).toContain('stroke-width="3"'); // fact: map.zone.stroke.sel
  });
});
