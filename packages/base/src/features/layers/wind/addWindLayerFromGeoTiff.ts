import type {
	IGeoTiffSource,
	IGrammarSymbologyState,
	IJupyterGISModel,
	IWindParticleLayer,
} from '@jupytergis/schema';
import { fromArrayBuffer } from 'geotiff';
import { WindLayer } from 'ol-wind';
import { Field, type IField } from 'wind-core';

import { grammarToWindColorScale } from '@/src/features/layers/wind/windColorScale';
import { loadFile } from '@/src/tools';

export interface IWindGeoTiffField extends IField {
	/** Geographic extent [minLon, minLat, maxLon, maxLat]. */
	extent4326: [number, number, number, number];
}

const DEFAULT_WIND_OPTIONS: NonNullable<IWindParticleLayer['windOptions']> = {
	globalAlpha: 0.9,
	paths: 3000,
	velocityScale: 1 / 40,
	lineWidth: 2,
	frameRate: 20,
	maxAge: 60,
};

/**
 * Merge document windOptions with defaults for ol-wind.
 * Particle colors come from Grammar symbologyState (colorMap), not windOptions.
 */
export function resolveWindOptions(
	windOptions?: IWindParticleLayer['windOptions'],
	symbologyState?: IWindParticleLayer['symbologyState'],
): Record<string, unknown> {
	return {
		...DEFAULT_WIND_OPTIONS,
		...(windOptions ?? {}),
		colorScale: grammarToWindColorScale(
			symbologyState as IGrammarSymbologyState | undefined,
		),
	};
}

/**
 * Read a 2-band U/V GeoTIFF into the flat grid `ol-wind` / `wind-core` expects.
 *
 * Band 1 = eastward (u), band 2 = northward (v). Pixel rows are north→south.
 */
export async function geoTiffToWindField(
	buffer: ArrayBuffer,
): Promise<IWindGeoTiffField> {
	const tiff = await fromArrayBuffer(buffer);
	const image = await tiff.getImage();
	const width = image.getWidth();
	const height = image.getHeight();
	const samples = image.getSamplesPerPixel();

	if (samples < 2) {
		throw new Error(
			'Wind GeoTIFF must have at least 2 bands (u and v components)',
		);
	}

	const rasters = await image.readRasters({
		samples: [0, 1],
		interleave: false,
	});

	if (!Array.isArray(rasters) || rasters.length < 2) {
		throw new Error('Failed to read U/V bands from GeoTIFF');
	}

	const uBand = rasters[0] as ArrayLike<number>;
	const vBand = rasters[1] as ArrayLike<number>;
	const [minX, minY, maxX, maxY] = image.getBoundingBox();

	const cols = width;
	const rows = height;
	// wind-core expects positive deltas for its grid check:
	//   ceil((xmax-xmin)/deltaX) === cols, ceil((ymax-ymin)/deltaY) === rows
	// GeoTIFF rows are north→south, so flipY maps lat correctly.
	const deltaX = cols > 0 ? (maxX - minX) / cols : 0;
	const deltaY = rows > 0 ? (maxY - minY) / rows : 0;

	const us = Array.from(uBand, value => (Number.isFinite(value) ? value : 0));
	const vs = Array.from(vBand, value => (Number.isFinite(value) ? value : 0));

	if (us.length !== cols * rows || vs.length !== cols * rows) {
		throw new Error(
			`Wind GeoTIFF band size mismatch: expected ${cols * rows}, got u=${us.length} v=${vs.length}`,
		);
	}

	return {
		xmin: minX,
		xmax: maxX,
		ymin: minY,
		ymax: maxY,
		cols,
		rows,
		deltaX,
		deltaY,
		flipY: true,
		us,
		vs,
		wrapX: false,
		extent4326: [minX, minY, maxX, maxY],
	};
}

/**
 * Load the first URL of a GeoTiffSource as an ArrayBuffer for wind parsing.
 */
export async function loadGeoTiffSourceBuffer(
	sourceParameters: IGeoTiffSource,
	model: IJupyterGISModel,
): Promise<ArrayBuffer> {
	const url = sourceParameters.urls?.[0]?.url ?? '';
	if (!url) {
		throw new Error('WindParticleLayer GeoTiffSource has no URL');
	}

	const isRemote = url.startsWith('http://') || url.startsWith('https://');
	const isDataUrl = url.startsWith('data:');

	if (isRemote || isDataUrl) {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch wind GeoTIFF: ${url}`);
		}
		return response.arrayBuffer();
	}

	const geotiff = await loadFile({
		filepath: url,
		type: 'GeoTiffSource',
		model,
	});
	if (!geotiff?.file) {
		throw new Error(`Could not load wind GeoTIFF from ${url}`);
	}
	return geotiff.file.arrayBuffer();
}

export interface ICreateWindLayerOptions {
	opacity?: number;
	visible?: boolean;
	windOptions?: IWindParticleLayer['windOptions'];
	symbologyState?: IWindParticleLayer['symbologyState'];
}

/**
 * Build an `ol-wind` layer from a 2-band U/V GeoTIFF buffer.
 * Does not add the layer to a map — callers own that (e.g. MainView).
 */
export async function createWindLayerFromGeoTiff(
	buffer: ArrayBuffer,
	options: ICreateWindLayerOptions = {},
): Promise<WindLayer> {
	const fieldParams = await geoTiffToWindField(buffer);
	// ol-wind only accepts a Field instance (or grib2json array), not a plain object.
	const field = new Field(fieldParams);

	return new WindLayer(field, {
		forceRender: true,
		projection: 'EPSG:4326',
		opacity: options.opacity ?? 1,
		visible: options.visible ?? true,
		className: 'jgis-wind-particle-layer',
		windOptions: resolveWindOptions(
			options.windOptions,
			options.symbologyState,
		),
	});
}
