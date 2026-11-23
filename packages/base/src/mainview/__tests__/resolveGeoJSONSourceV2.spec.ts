/**
 * @jest-environment node
 */

import { resolveGeoJSONSourceV2 } from '../adapters/resolveGeoJSONSourceV2';

describe('resolveGeoJSONSourceV2', () => {
  it('narrows inline data', () => {
    const data = {
      type: 'FeatureCollection' as const,
      features: [],
    };
    expect(
      resolveGeoJSONSourceV2({
        data,
        attribution: '© example',
      }),
    ).toEqual({
      kind: 'data',
      data,
      attribution: '© example',
    });
  });

  it('narrows workspace path', () => {
    expect(
      resolveGeoJSONSourceV2({
        path: 'data/quakes.geojson',
      }),
    ).toEqual({
      kind: 'path',
      path: 'data/quakes.geojson',
      attribution: undefined,
    });
  });

  it('narrows url without fetching', () => {
    expect(
      resolveGeoJSONSourceV2({
        url: 'https://example.com/layer.geojson',
        httpHeaders: { Authorization: 'Bearer x' },
        attribution: 'remote',
      }),
    ).toEqual({
      kind: 'url',
      url: 'https://example.com/layer.geojson',
      httpHeaders: { Authorization: 'Bearer x' },
      attribution: 'remote',
    });
  });
});
