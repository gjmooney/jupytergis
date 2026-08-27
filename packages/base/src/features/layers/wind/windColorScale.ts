import type { IWindParticleLayer } from '@jupytergis/schema';

import {
	ColorRampName,
	ensureHexColorCode,
	getColorMap,
} from '@/src/features/layers/symbology/colorRampUtils';

/**
 * Sample a JupyterGIS symbology color ramp into CSS colors for ol-wind.
 */
export function colorRampToWindColorScale(
	rampName: string,
	nClasses = 9,
	reverse = false,
): string[] {
	const colorMap = getColorMap(rampName as ColorRampName);
	if (!colorMap || colorMap.colors.length === 0) {
		return ['#7fdbff', '#ffdc00', '#ff4136'];
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
 * Resolve document windOptions into the object ol-wind expects.
 * Prefers explicit colorScale; otherwise samples from colorRamp.
 */
export function resolveWindColorScale(
	windOptions?: IWindParticleLayer['windOptions'],
): string | string[] {
	if (windOptions?.colorScale !== undefined) {
		return windOptions.colorScale;
	}

	return colorRampToWindColorScale(
		windOptions?.colorRamp ?? 'viridis',
		windOptions?.nClasses ?? 9,
		windOptions?.reverse ?? false,
	);
}
