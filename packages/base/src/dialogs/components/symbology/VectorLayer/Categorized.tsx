import React, { useEffect, useRef, useState } from 'react';
import ValueSelect from './lego/ValueSelect';
import { IStopRow, ISymbologyDialogProps } from '../../../symbologyDialog';
import { useGetProperties } from './useGetProperties';
import StopContainer from './lego/StopContainer';
import { VectorUtils } from '../symbologyUtils';
import ColorRamp from '../colorRamp/ColorRamp';
import { ReadonlyJSONObject } from '@lumino/coreutils';
import { ExpressionValue } from 'ol/expr/expression';
import colormap from 'colormap';

const Categorized = ({
  context,
  state,
  okSignalPromise,
  cancel,
  layerId
}: ISymbologyDialogProps) => {
  const selectedValueRef = useRef<string>();
  const layerStateRef = useRef<ReadonlyJSONObject | undefined>();
  const stopRowsRef = useRef<IStopRow[]>();

  const [selectedValue, setSelectedValue] = useState('');
  const [stopRows, setStopRows] = useState<IStopRow[]>([]);
  if (!layerId) {
    return;
  }
  const layer = context.model.getLayer(layerId);
  if (!layer?.parameters) {
    return;
  }
  const { featureProps } = useGetProperties({
    layerId,
    model: context.model
  });

  useEffect(() => {
    const valueColorPairs = VectorUtils.buildColorInfo(layer);

    setStopRows(valueColorPairs);

    okSignalPromise.promise.then(okSignal => {
      okSignal.connect(handleOk, this);
    });

    return () => {
      okSignalPromise.promise.then(okSignal => {
        okSignal.disconnect(handleOk, this);
      });
    };
  }, []);

  const buildColorInfoFromClassification = (
    selectedMode: string,
    numberOfShades: string,
    selectedRamp: string,
    setIsLoading: (isLoading: boolean) => void
  ) => {
    const stops = Array.from(featureProps[selectedValue]);

    const colorMap = colormap({
      colormap: selectedRamp,
      nshades: stops.length,
      format: 'rgba'
    });

    const valueColorPairs: IStopRow[] = [];

    for (let i = 0; i < stops.length; i++) {
      valueColorPairs.push({ stop: stops[i], output: colorMap[i] });
    }

    setStopRows(valueColorPairs);
  };

  const handleOk = () => {
    if (!layer.parameters) {
      return;
    }

    state.save(`jupytergis:${layerId}`, {
      ...layerStateRef.current,
      renderType: 'Categorized',
      categorizedValue: selectedValueRef.current
    });

    const colorExpr: ExpressionValue[] = [];
    colorExpr.push(['case']);
    // colorExpr.push(['get', selectedValueRef.current]);

    stopRowsRef.current?.map(stop => {
      colorExpr.push(['==', ['get', selectedValueRef.current], stop.stop]);
      colorExpr.push(stop.output);
    });

    // fallback value
    colorExpr.push([0, 0, 0, 0.0]);

    const newStyle = { ...layer.parameters.color };
    newStyle['circle-fill-color'] = colorExpr;

    layer.parameters.color = newStyle;

    context.model.sharedModel.updateLayer(layerId, layer);
    cancel();
  };

  return (
    <div className="jp-gis-layer-symbology-container">
      <ValueSelect
        featureProperties={featureProps}
        selectedValue={selectedValue}
        setSelectedValue={setSelectedValue}
      />

      <ColorRamp
        layerId={layerId}
        modeOptions={[]}
        classifyFunc={buildColorInfoFromClassification}
        showModeRow={false}
      />
      <StopContainer
        selectedMethod={''}
        stopRows={stopRows}
        setStopRows={setStopRows}
      />
    </div>
  );
};

export default Categorized;
