import type { IWindParticleLayer } from '@jupytergis/schema';

import {
	ColorRampName,
	ensureHexColorCode,
	getColorMap,
} from '@/src/features/layers/symbology/colorRampUtils';

const DEFAULT_WIND_COLOR_SCALE = ['#7fdbff', '#ffdc00', '#ff4136'];

export const DEFAULT_WIND_COLOR_OPTIONS = {
	colorRamp: 'viridis' as const,
	nClasses: 9,
	reverse: false,
};

/**
 * Sample a JupyterGIS color ramp into CSS colors for ol-wind.
 */
export function colorRampToWindColorScale(
	rampName: string,
	nClasses = 9,
	reverse = false,
): string[] {
	const colorMap = getColorMap(rampName as ColorRampName);
	if (!colorMap || colorMap.colors.length === 0) {
		return DEFAULT_WIND_COLOR_SCALE;
	}

	const colors = reverse
		? [...colorMap.colors].reverse()
		: [...colorMap.colors];
	const n = Math.max(2, Math.floor(nClasses));
	const step = (colors.length - 1) / (n - 1);

	return Array.from({ length: n }, (_, i) =>
		ensureHexColorCode(colors[Math.round(i * step)]),
	);
}

/**
 * Resolve particle colors from windOptions (explicit colorScale or colorRamp).
 */
export function resolveWindColorScale(
	windOptions?: IWindParticleLayer['windOptions'],
): string | string[] {
	if (windOptions?.colorScale !== undefined) {
		return windOptions.colorScale;
	}

	return colorRampToWindColorScale(
		windOptions?.colorRamp ?? DEFAULT_WIND_COLOR_OPTIONS.colorRamp,
		windOptions?.nClasses ?? DEFAULT_WIND_COLOR_OPTIONS.nClasses,
		windOptions?.reverse ?? DEFAULT_WIND_COLOR_OPTIONS.reverse,
	);
}
