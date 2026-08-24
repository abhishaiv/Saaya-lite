import type { PoliceStation } from "../../domain/model/policeStation";

type StationSourceRecord = Record<string, unknown>;
type StationStringField = Exclude<
  keyof PoliceStation,
  "latitude" | "longitude"
>;
type StationNumberField = Extract<
  keyof PoliceStation,
  "latitude" | "longitude"
>;

export class PoliceStationParseError extends Error {
  constructor(message: string) {
    super(`Malformed police station data: ${message}`);
    this.name = "PoliceStationParseError";
  }
}

function fail(message: string): never {
  throw new PoliceStationParseError(message);
}

function requireRecord(value: unknown, context: string): StationSourceRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${context} must be an object`);
  }

  return value as StationSourceRecord;
}

function requireOwnField(
  record: StationSourceRecord,
  field: keyof PoliceStation,
  context: string,
): unknown {
  if (!Object.prototype.hasOwnProperty.call(record, field)) {
    fail(`${context}.${field} is missing`);
  }

  return record[field];
}

function requireString(
  record: StationSourceRecord,
  field: StationStringField,
  context: string,
): string {
  const value = requireOwnField(record, field, context);
  if (typeof value !== "string") {
    fail(`${context}.${field} must be a string`);
  }

  return value;
}

function requireFiniteNumber(
  record: StationSourceRecord,
  field: StationNumberField,
  context: string,
): number {
  const value = requireOwnField(record, field, context);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`${context}.${field} must be a finite number`);
  }

  return value;
}

function parsePoliceStation(
  value: unknown,
  context: string,
): PoliceStation {
  const record = requireRecord(value, context);

  // Select only the fields specified by DATA_MODEL.md. Extra source fields are
  // deliberately ignored rather than leaking into the domain model.
  return {
    id: requireString(record, "id", context),
    name: requireString(record, "name", context),
    category: requireString(record, "category", context),
    locality: requireString(record, "locality", context),
    areaCovered: requireString(record, "areaCovered", context),
    latitude: requireFiniteNumber(record, "latitude", context),
    longitude: requireFiniteNumber(record, "longitude", context),
    coordPrecision: requireString(record, "coordPrecision", context),
    phone: requireString(record, "phone", context),
    address: requireString(record, "address", context),
  };
}

export function parsePoliceStations(value: unknown): PoliceStation[] {
  if (!Array.isArray(value)) {
    fail("root must be an array");
  }

  const seenIds = new Set<string>();

  return value.map((entry, index) => {
    const context = `station[${index}]`;
    const station = parsePoliceStation(entry, context);

    if (seenIds.has(station.id)) {
      fail(`${context}.id duplicates ${station.id}`);
    }

    seenIds.add(station.id);
    return station;
  });
}
