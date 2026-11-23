import type { IGeoJSONSourceV2 } from '@jupytergis/schema';
import type { GeoJSON } from 'geojson';

export type ResolvedGeoJSONSourceV2 =
  | { kind: 'data'; data: GeoJSON; attribution?: string }
  | { kind: 'path'; path: string; attribution?: string }
  | {
      kind: 'url';
      url: string;
      httpHeaders?: Record<string, string>;
      attribution?: string;
    };

/**
 * Narrow GeoJSONSourceV2 oneOf params for adapters.
 * Sync, no I/O — urls are passed through to the viz library.
 */
export function resolveGeoJSONSourceV2(
  params: IGeoJSONSourceV2,
): ResolvedGeoJSONSourceV2 {
  if ('data' in params) {
    return {
      kind: 'data',
      data: params.data as GeoJSON,
      attribution: params.attribution,
    };
  }
  if ('path' in params) {
    return {
      kind: 'path',
      path: params.path,
      attribution: params.attribution,
    };
  }
  return {
    kind: 'url',
    url: params.url,
    httpHeaders: params.httpHeaders,
    attribution: params.attribution,
  };
}
