import type { IGrammarSymbologyState } from '@jupytergis/schema';

import { extractColorMapGradient } from '@/src/features/layers/symbology/grammarToOLLayer';

const DEFAULT_WIND_COLOR_SCALE = ['#7fdbff', '#ffdc00', '#ff4136'];

/**
 * Derive ol-wind colorScale from Grammar symbology (same colorMap path as heatmaps).
 */
export function grammarToWindColorScale(
	symbologyState?: IGrammarSymbologyState | { layers?: unknown },
): string[] {
	const layers = symbologyState?.layers;
	if (!Array.isArray(layers)) {
		return DEFAULT_WIND_COLOR_SCALE;
	}

	for (const grammarLayer of layers) {
		const rules = (grammarLayer as { rules?: unknown })?.rules;
		if (!Array.isArray(rules)) {
			continue;
		}
		const gradient = extractColorMapGradient(rules as any);
		if (gradient && gradient.length > 0) {
			return gradient;
		}
	}

	return DEFAULT_WIND_COLOR_SCALE;
}
