import { IJupyterGISModel, IWindParticleLayer } from '@jupytergis/schema';
import { PromiseDelegate } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import React, { useCallback, useState } from 'react';

import ColorRampSelector from '@/src/features/layers/symbology/components/color_ramp/ColorRampSelector';
import { ColorRampName } from '@/src/features/layers/symbology/colorRampUtils';
import { useOkSignal } from '@/src/features/layers/symbology/hooks/useOkSignal';
import type { ISymbologyDialogProps } from '@/src/features/layers/symbology/symbologyDialog';
import { colorRampToWindColorScale } from '@/src/features/layers/wind/windColorScale';

interface IWindParticleSymbologyProps extends ISymbologyDialogProps {
	model: IJupyterGISModel;
	okSignalPromise: PromiseDelegate<Signal<any, null>>;
	layerId: string;
}

/**
 * Lightweight symbology panel for wind particles: color ramp → wind colorScale.
 */
export function WindParticleSymbology({
	model,
	okSignalPromise,
	layerId,
}: IWindParticleSymbologyProps): JSX.Element {
	const layer = model.getLayer(layerId);
	const windOptions =
		(layer?.parameters as IWindParticleLayer | undefined)?.windOptions ?? {};

	const [selectedRamp, setSelectedRamp] = useState<ColorRampName>(
		(windOptions.colorRamp as ColorRampName) ?? 'viridis',
	);
	const [reverse, setReverse] = useState(windOptions.reverse ?? false);
	const [nClasses, setNClasses] = useState(windOptions.nClasses ?? 9);
	const [minVelocity, setMinVelocity] = useState<string>(
		windOptions.minVelocity !== undefined
			? String(windOptions.minVelocity)
			: '',
	);
	const [maxVelocity, setMaxVelocity] = useState<string>(
		windOptions.maxVelocity !== undefined
			? String(windOptions.maxVelocity)
			: '',
	);

	const handleOk = useCallback(() => {
		const current = model.getLayer(layerId);
		if (!current?.parameters) {
			return;
		}

		const params = current.parameters as IWindParticleLayer;
		const nextWindOptions: NonNullable<IWindParticleLayer['windOptions']> = {
			...(params.windOptions ?? {}),
			colorRamp: selectedRamp,
			nClasses,
			reverse,
			colorScale: colorRampToWindColorScale(
				selectedRamp,
				nClasses,
				reverse,
			) as [string, ...string[]],
		};

		const min = minVelocity.trim() === '' ? undefined : Number(minVelocity);
		const max = maxVelocity.trim() === '' ? undefined : Number(maxVelocity);
		if (min !== undefined && Number.isFinite(min)) {
			nextWindOptions.minVelocity = min;
		} else {
			delete nextWindOptions.minVelocity;
		}
		if (max !== undefined && Number.isFinite(max)) {
			nextWindOptions.maxVelocity = max;
		} else {
			delete nextWindOptions.maxVelocity;
		}

		current.parameters = {
			...params,
			windOptions: nextWindOptions,
		};
		model.sharedModel.updateLayer(layerId, current);
	}, [
		layerId,
		maxVelocity,
		minVelocity,
		model,
		nClasses,
		reverse,
		selectedRamp,
	]);

	useOkSignal(okSignalPromise, handleOk);

	return (
		<div className="jp-gis-layer-symbology-container">
			<div className="jp-gis-symbology-row">
				<label htmlFor="jp-gis-wind-color-ramp">Color ramp</label>
				<ColorRampSelector
					selectedRamp={selectedRamp}
					setSelected={setSelectedRamp}
					reverse={reverse}
					setReverse={setReverse}
				/>
			</div>
			<div className="jp-gis-symbology-row">
				<label htmlFor="jp-gis-wind-n-classes">Classes</label>
				<input
					id="jp-gis-wind-n-classes"
					type="number"
					className="jp-mod-styled"
					min={2}
					step={1}
					value={nClasses}
					onChange={event => {
						const value = Number(event.target.value);
						if (Number.isFinite(value) && value >= 2) {
							setNClasses(Math.floor(value));
						}
					}}
				/>
			</div>
			<div className="jp-gis-symbology-row">
				<label htmlFor="jp-gis-wind-min-velocity">Min velocity</label>
				<input
					id="jp-gis-wind-min-velocity"
					type="number"
					className="jp-mod-styled"
					placeholder="auto"
					value={minVelocity}
					onChange={event => setMinVelocity(event.target.value)}
				/>
			</div>
			<div className="jp-gis-symbology-row">
				<label htmlFor="jp-gis-wind-max-velocity">Max velocity</label>
				<input
					id="jp-gis-wind-max-velocity"
					type="number"
					className="jp-mod-styled"
					placeholder="auto"
					value={maxVelocity}
					onChange={event => setMaxVelocity(event.target.value)}
				/>
			</div>
		</div>
	);
}
