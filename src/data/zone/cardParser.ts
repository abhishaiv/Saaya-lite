import type { ZoneCard } from "../../domain/model/zoneCard";

const SOURCE_FIELDS = [
  "station_id",
  "area_name",
  "full_areas",
  "risk_level",
  "risk_tier",
  "incident_count",
  "women_safety_count",
  "top_crimes",
  "risk_notes",
  "tourist_spots",
] as const;

const SOURCE_FIELD_SET: ReadonlySet<string> = new Set(SOURCE_FIELDS);

type JsonObject = Readonly<Record<string, unknown>>;

export class ZoneCardParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZoneCardParseError";
  }
}

function fail(rowIndex: number, message: string): never {
  throw new ZoneCardParseError(
    `zone_info_cards.json row ${rowIndex}: ${message}`,
  );
}

function requireObject(value: unknown, rowIndex: number): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(rowIndex, "expected an object");
  }

  return value as JsonObject;
}

function assertExactFields(value: JsonObject, rowIndex: number): void {
  for (const field of SOURCE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) {
      fail(rowIndex, `missing required field ${field}`);
    }
  }

  for (const field of Object.keys(value)) {
    if (!SOURCE_FIELD_SET.has(field)) {
      fail(rowIndex, `unexpected field ${field}`);
    }
  }
}

function requireString(
  value: JsonObject,
  field: string,
  rowIndex: number,
): string {
  const candidate = value[field];
  if (typeof candidate !== "string" || !candidate.trim()) {
    fail(rowIndex, `${field} must be a non-empty string`);
  }

  return candidate;
}

function requireInteger(
  value: JsonObject,
  field: string,
  rowIndex: number,
): number {
  const candidate = value[field];
  if (typeof candidate !== "number" || !Number.isSafeInteger(candidate)) {
    fail(rowIndex, `${field} must be an integer`);
  }

  return candidate;
}

/**
 * Parses the imported contents of zone_info_cards.json.
 *
 * The map key is the asset's station_id. Duplicate keys and any schema drift
 * throw ZoneCardParseError rather than silently discarding source data.
 */
export function parseZoneCards(source: unknown): Map<string, ZoneCard> {
  if (!Array.isArray(source)) {
    throw new ZoneCardParseError(
      "zone_info_cards.json must contain an array",
    );
  }

  const cards = new Map<string, ZoneCard>();

  for (const [rowIndex, entry] of source.entries()) {
    const value = requireObject(entry, rowIndex);
    assertExactFields(value, rowIndex);

    const card: ZoneCard = {
      stationId: requireString(value, "station_id", rowIndex),
      areaName: requireString(value, "area_name", rowIndex),
      fullAreas: requireString(value, "full_areas", rowIndex),
      riskLevel: requireString(value, "risk_level", rowIndex),
      riskTier: requireString(value, "risk_tier", rowIndex),
      incidentCount: requireInteger(value, "incident_count", rowIndex),
      womenSafetyCount: requireInteger(
        value,
        "women_safety_count",
        rowIndex,
      ),
      topCrimes: requireString(value, "top_crimes", rowIndex),
      riskNotes: requireString(value, "risk_notes", rowIndex),
      touristSpots: requireString(value, "tourist_spots", rowIndex),
    };

    if (cards.has(card.stationId)) {
      fail(rowIndex, `duplicate station_id ${card.stationId}`);
    }

    cards.set(card.stationId, card);
  }

  return cards;
}
