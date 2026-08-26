import { bundledZoneData, type ZoneData } from "../zone/zoneLoader";
import { RiskTier, type Zone } from "../../domain/model/zone";
import type { ZoneCard } from "../../domain/model/zoneCard";

export interface MapZone {
  readonly areaName: string;
  readonly riskLevel: string;
  readonly zone: Zone;
}

export interface DemoZone {
  readonly id: string;
  readonly label: string;
}

export interface ZoneRepositorySnapshot {
  readonly mapZones: readonly MapZone[];
  readonly demoZones: readonly DemoZone[];
}

export interface ZoneRepository {
  snapshot(): ZoneRepositorySnapshot;
}

const EXPECTED_DRAWN_ZONE_COUNT = 19; // fact: zones.drawn
const EXPECTED_DEMO_ZONE_COUNT = 24; // fact: zones.total

function joinMapZones(data: ZoneData): readonly MapZone[] {
  const mapZones = data.zones
    .filter((zone) => zone.riskTier !== RiskTier.SAFE)
    .map((zone) => {
      const card = data.cardsByStationId.get(zone.stationId);
      if (card === undefined) {
        throw new Error(
          `Drawn zone ${zone.stationId} has no ZoneCard.areaName map label`,
        );
      }
      return { areaName: card.areaName, riskLevel: card.riskLevel, zone };
    });

  if (mapZones.length !== EXPECTED_DRAWN_ZONE_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_DRAWN_ZONE_COUNT} drawn zones, received ${mapZones.length}`,
    );
  }

  return mapZones;
}

function demoZones(zones: readonly Zone[]): readonly DemoZone[] {
  if (zones.length !== EXPECTED_DEMO_ZONE_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_DEMO_ZONE_COUNT} demo zones, received ${zones.length}`,
    );
  }

  // The picker uses the complete locality list from the frozen data. It does not
  // repurpose police-jurisdiction names as place labels, and it works for SAFE rows
  // that deliberately have no ZoneCard.
  return zones.map((zone) => ({ id: zone.stationId, label: zone.areasCovered }));
}

export class BundledZoneRepository implements ZoneRepository {
  constructor(private readonly data: ZoneData = bundledZoneData) {}

  snapshot(): ZoneRepositorySnapshot {
    return {
      mapZones: joinMapZones(this.data),
      demoZones: demoZones(this.data.zones),
    };
  }
}

export class FakeZoneRepository implements ZoneRepository {
  constructor(private readonly value: ZoneRepositorySnapshot) {}

  snapshot(): ZoneRepositorySnapshot {
    return this.value;
  }
}

export const bundledZoneRepository = new BundledZoneRepository();

export function mapZoneCard(
  mapZone: MapZone,
  cardsByStationId: ReadonlyMap<string, ZoneCard>,
): ZoneCard {
  const card = cardsByStationId.get(mapZone.zone.stationId);
  if (card === undefined) {
    throw new Error(`Map zone ${mapZone.zone.stationId} lost its required card join`);
  }
  return card;
}
