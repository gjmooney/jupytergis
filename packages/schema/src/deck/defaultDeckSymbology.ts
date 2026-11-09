/**
 * Runtime defaults for DeckGL layer symbology.
 *
 * Not schema defaults — applied when creating layers (and by migration when
 * synthesizing symbology from legacy paint fields).
 */

export type Rgba = [number, number, number, number];

export type NewId = () => string;

export interface IDeckSymbologyState {
  layers: Array<{
    id: string;
    rules: Array<{
      id: string;
      fields?: string[];
      mappings: Array<{
        encodings: string[];
        scale:
          | {
              scheme: 'constant_rgba';
              params: { value: Rgba };
            }
          | {
              scheme: 'constant_num';
              params: { value: number };
            }
          | {
              scheme: 'identity';
            }
          | {
              scheme: 'colorMap';
              params: {
                name: string;
                nShades: number;
                mode: 'equal interval';
                reverse: boolean;
                fallback: Rgba;
              };
            };
      }>;
    }>;
  }>;
}

/** deck.gl TripsLayer docs example color. */
export const DEFAULT_TRIPS_COLOR: Rgba = [253, 128, 93, 1];
/** deck.gl TripsLayer docs example width (pixels). */
export const DEFAULT_TRIPS_WIDTH = 8;

/** Former PolygonLayer fillColor, alpha as 0–1. */
export const DEFAULT_POLYGON_FILL: Rgba = [0, 128, 255, 0.63];
export const DEFAULT_POLYGON_STROKE: Rgba = [80, 80, 80, 1];
export const DEFAULT_POLYGON_STROKE_WIDTH = 1;

/** deck.gl GeoJsonLayer docs example fill, alpha as 0–1. */
export const DEFAULT_GEOJSON_FILL: Rgba = [160, 160, 180, 0.78];
export const DEFAULT_GEOJSON_STROKE: Rgba = [80, 80, 80, 1];
export const DEFAULT_GEOJSON_STROKE_WIDTH = 1;
export const DEFAULT_GEOJSON_POINT_RADIUS = 4;

/**
 * Normalize a legacy RGB/RGBA array to grammar RGBA (A is 0–1).
 * If a 4th channel looks like 0–255 (> 1), scale it down.
 */
export function toGrammarRgba(
  color: number[] | undefined,
  fallback: Rgba,
): Rgba {
  if (!color || color.length < 3) {
    return fallback;
  }
  const r = color[0] ?? fallback[0];
  const g = color[1] ?? fallback[1];
  const b = color[2] ?? fallback[2];
  let a = color.length >= 4 ? (color[3] as number) : 1;
  if (a > 1) {
    a = a / 255;
  }
  return [r, g, b, a];
}

export function defaultTripsSymbology(
  newId: NewId,
  options?: { color?: Rgba; width?: number },
): IDeckSymbologyState {
  const color = options?.color ?? DEFAULT_TRIPS_COLOR;
  const width = options?.width ?? DEFAULT_TRIPS_WIDTH;
  return {
    layers: [
      {
        id: newId(),
        rules: [
          {
            id: newId(),
            mappings: [
              {
                encodings: ['fill-color', 'stroke-color'],
                scale: {
                  scheme: 'constant_rgba',
                  params: { value: color },
                },
              },
              {
                encodings: ['stroke-width', 'circle-radius'],
                scale: {
                  scheme: 'constant_num',
                  params: { value: width },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

export function defaultPolygonSymbology(
  newId: NewId,
  options?: {
    fill?: Rgba;
    stroke?: Rgba;
    strokeWidth?: number;
    elevationField?: string;
  },
): IDeckSymbologyState {
  const fill = options?.fill ?? DEFAULT_POLYGON_FILL;
  const stroke = options?.stroke ?? DEFAULT_POLYGON_STROKE;
  const strokeWidth = options?.strokeWidth ?? DEFAULT_POLYGON_STROKE_WIDTH;
  const rules: IDeckSymbologyState['layers'][0]['rules'] = [
    {
      id: newId(),
      mappings: [
        {
          encodings: ['fill-color'],
          scale: {
            scheme: 'constant_rgba',
            params: { value: fill },
          },
        },
        {
          encodings: ['stroke-color'],
          scale: {
            scheme: 'constant_rgba',
            params: { value: stroke },
          },
        },
        {
          encodings: ['stroke-width'],
          scale: {
            scheme: 'constant_num',
            params: { value: strokeWidth },
          },
        },
      ],
    },
  ];
  if (options?.elevationField) {
    rules.push({
      id: newId(),
      fields: [options.elevationField],
      mappings: [
        {
          encodings: ['elevation'],
          scale: { scheme: 'identity' },
        },
      ],
    });
  }
  return {
    layers: [
      {
        id: newId(),
        rules,
      },
    ],
  };
}

export function defaultGeoJsonSymbology(newId: NewId): IDeckSymbologyState {
  return {
    layers: [
      {
        id: newId(),
        rules: [
          {
            id: newId(),
            mappings: [
              {
                encodings: ['fill-color', 'circle-fill-color'],
                scale: {
                  scheme: 'constant_rgba',
                  params: { value: DEFAULT_GEOJSON_FILL },
                },
              },
              {
                encodings: ['stroke-color', 'circle-stroke-color'],
                scale: {
                  scheme: 'constant_rgba',
                  params: { value: DEFAULT_GEOJSON_STROKE },
                },
              },
              {
                encodings: ['stroke-width', 'circle-stroke-width'],
                scale: {
                  scheme: 'constant_num',
                  params: { value: DEFAULT_GEOJSON_STROKE_WIDTH },
                },
              },
              {
                encodings: ['circle-radius'],
                scale: {
                  scheme: 'constant_num',
                  params: { value: DEFAULT_GEOJSON_POINT_RADIUS },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

/** deck.gl HexagonLayer default ramp (colorbrewer 6-class YlOrRd). */
export const DEFAULT_HEXAGON_COLOR_RANGE: Rgba[] = [
  [255, 255, 178, 1],
  [254, 217, 118, 1],
  [254, 178, 76, 1],
  [253, 141, 60, 1],
  [240, 59, 32, 1],
  [189, 0, 38, 1],
];

/**
 * Hexagon color ramp via colorMap. Position/weights come from geometry
 * binding at render time (defaults: position, weight 1).
 */
export function defaultHexagonSymbology(newId: NewId): IDeckSymbologyState {
  return {
    layers: [
      {
        id: newId(),
        rules: [
          {
            id: newId(),
            mappings: [
              {
                encodings: ['fill-color'],
                scale: {
                  scheme: 'colorMap',
                  params: {
                    name: 'YiOrRd',
                    nShades: 6,
                    mode: 'equal interval',
                    reverse: false,
                    fallback: [0, 0, 0, 1],
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

export function defaultSymbologyForDeckLayerType(
  layerType: string,
  newId: NewId,
): IDeckSymbologyState | undefined {
  switch (layerType) {
    case 'TripsLayer':
      return defaultTripsSymbology(newId);
    case 'PolygonLayer':
      return defaultPolygonSymbology(newId);
    case 'GeoJsonLayer':
      return defaultGeoJsonSymbology(newId);
    case 'HexagonLayer':
      return defaultHexagonSymbology(newId);
    default:
      return undefined;
  }
}

export function hasGrammarLayers(symbologyState: unknown): boolean {
  if (!symbologyState || typeof symbologyState !== 'object') {
    return false;
  }
  const layers = (symbologyState as { layers?: unknown }).layers;
  return Array.isArray(layers) && layers.length > 0;
}
