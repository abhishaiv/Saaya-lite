import type { HeatmapPoint } from "../../domain/model/heatmapPoint";

type JsonObject = Readonly<Record<string, unknown>>;

const SOURCE_FIELDS = [
  "name",
  "latitude",
  "longitude",
  "crimeCount",
  "womenSafetyCount",
  "weight",
] as const;

const SOURCE_FIELD_SET: ReadonlySet<string> = new Set(SOURCE_FIELDS);

export class HeatmapPointParseError extends Error {
  constructor(message: string) {
    super(`Malformed heatmap point data: ${message}`);
    this.name = "HeatmapPointParseError";
  }
}

function fail(rowIndex: number, message: string): never {
  throw new HeatmapPointParseError(
    `vizag_heatmap_points.json row ${rowIndex}: ${message}`,
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
  field: "name",
  rowIndex: number,
): string {
  const candidate = value[field];
  if (typeof candidate !== "string" || !candidate.trim()) {
    fail(rowIndex, `${field} must be a non-empty string`);
  }

  return candidate;
}

function requireFiniteNumber(
  value: JsonObject,
  field: Exclude<keyof HeatmapPoint, "name">,
  rowIndex: number,
): number {
  const candidate = value[field];
  if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
    fail(rowIndex, `${field} must be a finite number`);
  }

  return candidate;
}

function requireNonNegativeInteger(
  value: JsonObject,
  field: "crimeCount" | "womenSafetyCount",
  rowIndex: number,
): number {
  const candidate = requireFiniteNumber(value, field, rowIndex);
  if (!Number.isInteger(candidate) || candidate < 0) {
    fail(rowIndex, `${field} must be a non-negative integer`);
  }

  return candidate;
}

function requireUnitInterval(
  value: JsonObject,
  field: "weight",
  rowIndex: number,
): number {
  const candidate = requireFiniteNumber(value, field, rowIndex);
  if (candidate < 0 || candidate > 1) {
    fail(rowIndex, `${field} must be within the unit interval`);
  }

  return candidate;
}

/** Parses the frozen localized source without browser APIs or source mutation. */
export function parseHeatmapPoints(source: unknown): readonly HeatmapPoint[] {
  if (!Array.isArray(source)) {
    throw new HeatmapPointParseError(
      "vizag_heatmap_points.json must contain an array",
    );
  }

  return source.map((entry, rowIndex) => {
    const value = requireObject(entry, rowIndex);
    assertExactFields(value, rowIndex);
    return {
      name: requireString(value, "name", rowIndex),
      latitude: requireFiniteNumber(value, "latitude", rowIndex),
      longitude: requireFiniteNumber(value, "longitude", rowIndex),
      crimeCount: requireNonNegativeInteger(value, "crimeCount", rowIndex),
      womenSafetyCount: requireNonNegativeInteger(
        value,
        "womenSafetyCount",
        rowIndex,
      ),
      weight: requireUnitInterval(value, "weight", rowIndex),
    };
  });
}
