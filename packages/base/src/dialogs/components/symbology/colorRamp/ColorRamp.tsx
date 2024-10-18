import { Button } from '@jupyterlab/ui-components';
import React, { useEffect, useState } from 'react';
import CanvasSelectComponent from './CanvasSelectComponent';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReadonlyJSONObject } from '@lumino/coreutils';
import { GlobalStateDbManager } from '../../../../store';
import ModeSelectRow from './ModeSelectRow';

interface IColorRampProps {
  modeOptions: string[];
  layerId: string;
  classifyFunc: (
    selectedMode: string,
    numberOfShades: string,
    selectedRamp: string,
    setIsLoading: (isLoading: boolean) => void
  ) => void;
  showModeRow: boolean;
}

const ColorRamp = ({
  layerId,
  modeOptions,
  classifyFunc,
  showModeRow
}: IColorRampProps) => {
  const [selectedRamp, setSelectedRamp] = useState('cool');
  const [selectedMode, setSelectedMode] = useState('quantile');
  const [numberOfShades, setNumberOfShades] = useState('9');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    populateOptions();
  }, []);

  const populateOptions = async () => {
    const stateDb = GlobalStateDbManager.getInstance().getStateDb();

    const layerState = (await stateDb?.fetch(
      `jupytergis:${layerId}`
    )) as ReadonlyJSONObject;

    let nClasses, singleBandMode, colorRamp;

    if (layerState) {
      nClasses = layerState.numberOfShades as string;
      singleBandMode = layerState.selectedMode as string;
      colorRamp = layerState.selectedRamp as string;
    }

    setNumberOfShades(nClasses ? nClasses : '9');
    setSelectedMode(singleBandMode ? singleBandMode : 'equal interval');
    setSelectedRamp(colorRamp ? colorRamp : 'cool');
  };

  return (
    <div className="jp-gis-color-ramp-container">
      <div className="jp-gis-symbology-row">
        <label htmlFor="color-ramp-select">Color Ramp:</label>
        <CanvasSelectComponent
          selectedRamp={selectedRamp}
          setSelected={setSelectedRamp}
        />
      </div>
      {showModeRow && (
        <ModeSelectRow
          modeOptions={modeOptions}
          numberOfShades={numberOfShades}
          setNumberOfShades={setNumberOfShades}
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
        />
      )}
      {isLoading ? (
        <FontAwesomeIcon icon={faSpinner} className="jp-gis-loading-spinner" />
      ) : (
        <Button
          className="jp-Dialog-button jp-mod-accept jp-mod-styled"
          onClick={() =>
            classifyFunc(
              selectedMode,
              numberOfShades,
              selectedRamp,
              setIsLoading
            )
          }
        >
          Classify
        </Button>
      )}
    </div>
  );
};

export default ColorRamp;
