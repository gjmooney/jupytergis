import {
  DEFAULT_HEXAGON_COLOR_RANGE,
  type IGrammarSymbologyState,
  type Rgba,
} from '@jupytergis/schema';
import colormap from 'colormap';

/** deck.gl colorRange entry: RGB or RGBA, channels 0–255. */
export type DeckColorRangeEntry =
  | [number, number, number]
  | [number, number, number, number];

/**
 * Resolve HexagonLayer colorRange from grammar symbology.
 * First fill-color colorMap wins; otherwise the deck.gl YlOrRd default.
 */
export function hexagonColorRange(
  state: IGrammarSymbologyState | undefined,
): DeckColorRangeEntry[] {
  for (const layer of state?.layers ?? []) {
    for (const rule of layer.rules ?? []) {
      for (const mapping of rule.mappings ?? []) {
        if (
          !mapping.encodings?.includes('fill-color') ||
          mapping.scale?.scheme !== 'colorMap'
        ) {
          continue;
        }

        const params = mapping.scale.params;
        const nShades = Math.max(2, Math.floor(params.nShades ?? 6));
        try {
          const ramp = colormap({
            colormap: params.name,
            nshades: nShades,
            format: 'rgba',
          }) as number[][];
          const colors = ramp.map(toDeckColor);
          if (params.reverse) {
            colors.reverse();
          }
          if (colors.length > 0) {
            return colors;
          }
        } catch {
          // Fall through to the hardcoded deck default.
        }
      }
    }
  }

  return DEFAULT_HEXAGON_COLOR_RANGE.map(toDeckColor);
}

function toDeckColor(color: number[] | Rgba): DeckColorRangeEntry {
  const r = color[0] ?? 0;
  const g = color[1] ?? 0;
  const b = color[2] ?? 0;
  let a = color.length >= 4 ? (color[3] as number) : 1;
  if (a <= 1) {
    a = Math.round(a * 255);
  }
  return [r, g, b, a];
}
