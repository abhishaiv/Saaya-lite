import {
  RiskTier,
  type CrimeBreakdown,
  type LatLng,
  type Zone,
  type ZoneColorHex,
} from "../../domain/model/zone";

type UnknownRecord = Record<string, unknown>;

const MINIMUM_LINEAR_RING_POSITIONS = 4; // GROUNDED-EXEMPT: GeoJSON structure.

export class ZoneParseError extends Error {
  readonly path: string;

  constructor(path: string, problem: string) {
    super(`Invalid zone GeoJSON at ${path}: ${problem}`);
    this.name = "ZoneParseError";
    this.path = path;
  }
}

function fail(path: string, problem: string): never {
  throw new ZoneParseError(path, problem);
}

function decodeJson(source: unknown): unknown {
  if (typeof source !== "string") {
    return source;
  }

  try {
    return JSON.parse(source) as unknown;
  } catch {
    return fail("$", "expected valid JSON");
  }
}

function readRecord(value: unknown, path: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "expected an object");
  }

  return value as UnknownRecord;
}

function readArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    return fail(path, "expected an array");
  }

  return value;
}

function readProperty(
  record: UnknownRecord,
  key: string,
  path: string,
): unknown {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    return fail(`${path}.${key}`, "missing required property");
  }

  return record[key];
}

function readString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    return fail(path, "expected a non-empty string");
  }

  return value;
}

function readNullableString(value: unknown, path: string): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return fail(path, "expected a string or null");
  }

  return value;
}

function readFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail(path, "expected a finite number");
  }

  return value;
}

function readUnitInterval(value: unknown, path: string): number {
  const number = readFiniteNumber(value, path);
  if (number < 0 || number > 1) {
    return fail(path, "expected a number from zero through one");
  }

  return number;
}

function readNonNegativeInteger(value: unknown, path: string): number {
  const number = readFiniteNumber(value, path);
  if (!Number.isInteger(number) || number < 0) {
    return fail(path, "expected a non-negative integer");
  }

  return number;
}

function readPositiveInteger(value: unknown, path: string): number {
  const number = readFiniteNumber(value, path);
  if (!Number.isInteger(number) || number <= 0) {
    return fail(path, "expected a positive integer");
  }

  return number;
}

function readRiskTier(value: unknown, path: string): RiskTier {
  switch (value) {
    case "high":
      return RiskTier.HIGH;
    case "elevated":
      return RiskTier.ELEVATED;
    case "moderate":
      return RiskTier.MODERATE;
    case "safe":
      return RiskTier.SAFE;
    default:
      return fail(path, "expected high, elevated, moderate, or safe");
  }
}

function readColorHex(value: unknown, path: string): ZoneColorHex {
  switch (value) {
    case "#FF3B30":
    case "#FF9500":
    case "#FFCC00":
    case "#00000000":
      return value;
    default:
      return fail(path, "expected a specified zone colour");
  }
}

function readCoordinate(value: unknown, path: string): LatLng {
  const pair = readArray(value, path);
  if (pair.length !== 2) {
    return fail(path, "expected one [longitude, latitude] pair");
  }

  const longitude = readFiniteNumber(pair[0], `${path}[0]`);
  const latitude = readFiniteNumber(pair[1], `${path}[1]`);

  return { latitude, longitude };
}

function readPolygon(value: unknown, path: string): readonly LatLng[] {
  const rings = readArray(value, path);
  if (rings.length !== 1) {
    return fail(path, "expected a Polygon with exactly one exterior ring");
  }

  const rawRing = readArray(rings[0], `${path}[0]`);
  if (rawRing.length < MINIMUM_LINEAR_RING_POSITIONS) {
    return fail(`${path}[0]`, "expected at least four positions in the ring");
  }

  const ring = rawRing.map((coordinate, index) =>
    readCoordinate(coordinate, `${path}[0][${index}]`),
  );
  const first = ring[0];
  const last = ring[ring.length - 1];

  if (
    first.latitude !== last.latitude ||
    first.longitude !== last.longitude
  ) {
    return fail(`${path}[0]`, "expected a closed exterior ring");
  }

  return ring;
}

function readCrimeBreakdown(value: unknown, path: string): CrimeBreakdown {
  const record = readRecord(value, path);
  const entries = Object.entries(record);
  if (entries.length === 0) {
    return fail(path, "expected at least one crime category");
  }

  return Object.fromEntries(
    entries.map(([category, count]) => {
      if (category.trim() === "") {
        return fail(path, "expected non-empty crime category names");
      }

      return [
        category,
        readNonNegativeInteger(count, `${path}[${JSON.stringify(category)}]`),
      ];
    }),
  );
}

function parseFeature(value: unknown, index: number): Zone {
  const path = `$.features[${index}]`;
  const feature = readRecord(value, path);

  if (readProperty(feature, "type", path) !== "Feature") {
    return fail(`${path}.type`, 'expected "Feature"');
  }

  const geometryPath = `${path}.geometry`;
  const geometry = readRecord(
    readProperty(feature, "geometry", path),
    geometryPath,
  );
  if (readProperty(geometry, "type", geometryPath) !== "Polygon") {
    return fail(`${geometryPath}.type`, 'expected "Polygon"');
  }

  const polygon = readPolygon(
    readProperty(geometry, "coordinates", geometryPath),
    `${geometryPath}.coordinates`,
  );
  const propertiesPath = `${path}.properties`;
  const properties = readRecord(
    readProperty(feature, "properties", path),
    propertiesPath,
  );
  const property = (key: string): unknown =>
    readProperty(properties, key, propertiesPath);

  return {
    stationId: readString(property("station_id"), `${propertiesPath}.station_id`),
    stationName: readString(
      property("station_name"),
      `${propertiesPath}.station_name`,
    ),
    district: readString(property("district"), `${propertiesPath}.district`),
    polygon,
    centroid: {
      latitude: readFiniteNumber(
        property("latitude"),
        `${propertiesPath}.latitude`,
      ),
      longitude: readFiniteNumber(
        property("longitude"),
        `${propertiesPath}.longitude`,
      ),
    },
    riskScore: readUnitInterval(
      property("risk_score"),
      `${propertiesPath}.risk_score`,
    ),
    riskTier: readRiskTier(
      property("risk_tier"),
      `${propertiesPath}.risk_tier`,
    ),
    colorHex: readColorHex(property("color"), `${propertiesPath}.color`),
    opacity: readUnitInterval(
      property("opacity"),
      `${propertiesPath}.opacity`,
    ),
    totalCases: readNonNegativeInteger(
      property("total_cases"),
      `${propertiesPath}.total_cases`,
    ),
    womenSafetyCases: readNonNegativeInteger(
      property("women_safety_cases"),
      `${propertiesPath}.women_safety_cases`,
    ),
    crimeBreakdown: readCrimeBreakdown(
      property("crime_breakdown"),
      `${propertiesPath}.crime_breakdown`,
    ),
    geofenceRadiusM: readPositiveInteger(
      property("geofence_radius_m"),
      `${propertiesPath}.geofence_radius_m`,
    ),
    areasCovered: readString(
      property("areas_covered"),
      `${propertiesPath}.areas_covered`,
    ),
    touristSpots: readNullableString(
      property("tourist_spots"),
      `${propertiesPath}.tourist_spots`,
    ),
    riskNotes: readNullableString(
      property("risk_notes"),
      `${propertiesPath}.risk_notes`,
    ),
  };
}

/** Parse the bundled zone GeoJSON without using browser APIs or mutating the source. */
export function parseZones(source: unknown): readonly Zone[] {
  const root = readRecord(decodeJson(source), "$");
  if (readProperty(root, "type", "$") !== "FeatureCollection") {
    return fail("$.type", 'expected "FeatureCollection"');
  }

  return readArray(readProperty(root, "features", "$"), "$.features").map(
    parseFeature,
  );
}
