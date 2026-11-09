/**
 * HexagonSource points, loaded the same way as the deck.gl 3D heatmap
 * example: CSVLoader, then `[lng, lat]` rows for `getPosition: d => d`.
 */
import { load, parse } from '@loaders.gl/core';
import { CSVLoader } from '@loaders.gl/csv';

export type LngLat = [longitude: number, latitude: number];

const LOADER_OPTIONS = { worker: false } as const;

export async function loadHexagonPoints(
  payload: unknown,
): Promise<LngLat[]> {
  if (Array.isArray(payload)) {
    return toPoints(payload);
  }

  if (typeof payload !== 'string') {
    throw new Error('HexagonSource payload must be a CSV URL, CSV text, or a JSON array.');
  }

  const text = payload.trim();
  if (!text) {
    return [];
  }

  if (text.startsWith('http://') || text.startsWith('https://')) {
    return toPoints(await load(text, CSVLoader, LOADER_OPTIONS));
  }

  if (text.startsWith('[')) {
    return toPoints(JSON.parse(text) as unknown);
  }

  return toPoints(await parse(text, CSVLoader, LOADER_OPTIONS));
}

/**
 * deck.gl example:
 * `(await load(url, CSVLoader)).data.map(d => Number.isFinite(d.lng) ? [d.lng, d.lat] : null)`
 */
function toPoints(result: unknown): LngLat[] {
  const rows = csvRows(result);
  const points: LngLat[] = [];

  for (const row of rows) {
    if (isLngLat(row)) {
      points.push([row[0], row[1]]);
      continue;
    }

    if (!row || typeof row !== 'object') {
      continue;
    }

    const record = row as { lng?: number; lat?: number };
    if (Number.isFinite(record.lng)) {
      points.push([record.lng as number, record.lat as number]);
    }
  }

  return points;
}

function csvRows(result: unknown): unknown[] {
  if (Array.isArray(result)) {
    return result;
  }

  if (result && typeof result === 'object' && 'data' in result) {
    const data = (result as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data;
    }
  }

  throw new Error('HexagonSource CSV did not parse.');
}

function isLngLat(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1])
  );
}
