import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@jupyterlab/ui-components';
import initGdalJs from 'gdal3.js';
import { ExpressionValue } from 'ol/expr/expression';
import React, { useEffect, useRef, useState } from 'react';
import { ISymbologyDialogProps } from '../../symbologyDialog';
import BandRow from './BandRow';
import StopRow from './StopRow';

export interface IStopRow {
  value: number;
  color: number[];
}

export interface IBandRow {
  band: number;
  colorInterpretation: string;
}

type interpolationType = 'discrete' | 'linear' | 'exact';

const SingleBandPseudoColor = ({
  context,
  state,
  okSignalPromise,
  cancel,
  layerId
}: ISymbologyDialogProps) => {
  const functions = ['discrete', 'linear', 'exact'];
  const rowsRef = useRef<IStopRow[]>();
  const selectedFunctionRef = useRef<interpolationType>();
  const [selectedFunction, setSelectedFunction] = useState<interpolationType>();
  const [selectedBand, setSelectedBand] = useState(1);
  const [stopRows, setStopRows] = useState<IStopRow[]>([]);
  const [bandRows, setBandRows] = useState<IBandRow[]>([]);

  if (!layerId) {
    return;
  }
  const layer = context.model.getLayer(layerId);
  if (!layer) {
    return;
  }

  useEffect(() => {
    getBandInfo();

    // This it to parse a color object on the layer
    if (!layer.parameters?.color) {
      return;
    }

    const color = layer.parameters.color;

    // If color is a string we don't need to parse
    if (typeof color === 'string') {
      return;
    }
    const pairedObjects: IStopRow[] = [];

    // So if it's not a string then it's an array and we parse
    // Color[0] is the operator used for the color expression
    switch (color[0]) {
      case 'interpolate': {
        // First element is interpolate for linear selection
        // Second element is type of interpolation (ie linear)
        // Third is input value that stop values are compared with
        // Fourth and on is value:color pairs
        for (let i = 3; i < color.length; i += 2) {
          const obj: IStopRow = {
            value: color[i],
            color: color[i + 1]
          };
          pairedObjects.push(obj);
        }
        break;
      }
      case 'case': {
        // First element is case for discrete and exact selections
        // Second element is the condition
        // Within that, first is logical operator, second is band, third is value
        // Third element is color
        // Last element is fallback value
        for (let i = 1; i < color.length - 1; i += 2) {
          const obj: IStopRow = {
            value: color[i][2],
            color: color[i + 1]
          };
          pairedObjects.push(obj);
        }
        break;
      }
    }

    setInitialFunction(color);
    setStopRows(pairedObjects);
  }, []);

  useEffect(() => {
    rowsRef.current = stopRows;
  }, [stopRows]);

  useEffect(() => {
    selectedFunctionRef.current = selectedFunction;
  }, [selectedFunction]);

  const setInitialFunction = (colorParam: any[]) => {
    if (colorParam[0] === 'interpolate') {
      setSelectedFunction('linear');
      return;
    }

    // If expression is using 'case' we look at the comparison operator to set selected function
    const operator = colorParam[1][0];
    operator === '<='
      ? setSelectedFunction('discrete')
      : setSelectedFunction('exact');
  };

  const getBandInfo = async () => {
    const bandsArr: IBandRow[] = [];

    const tifDataState = (await state.fetch(layerId)) as string;
    if (tifDataState) {
      const tifData = JSON.parse(tifDataState);

      tifData['bands'].forEach(
        (bandData: { band: number; colorInterpretation: string }) => {
          bandsArr.push({
            band: bandData.band,
            colorInterpretation: bandData.colorInterpretation
          });
        }
      );
      setBandRows(bandsArr);

      return;
    }

    const source = context.model.getSource(layer?.parameters?.source);

    const sourceUrl = source?.parameters?.urls[0].url;

    if (!sourceUrl) {
      return;
    }

    //! This takes so long, maybe do when adding source instead
    const Gdal = await initGdalJs({
      path: 'lab/extensions/@jupytergis/jupytergis-core/static',
      useWorker: false
    });

    const fileData = await fetch(sourceUrl);
    const file = new File([await fileData.blob()], 'loaded.tif');

    const result = await Gdal.open(file);
    const tifDataset = result.datasets[0];
    const tifDatasetInfo: any = await Gdal.gdalinfo(tifDataset);

    tifDatasetInfo['bands'].forEach(
      (bandData: { band: number; colorInterpretation: string }) => {
        bandsArr.push({
          band: bandData.band,
          colorInterpretation: bandData.colorInterpretation
        });
      }
    );

    state.save(layerId, JSON.stringify(tifDatasetInfo));
    setBandRows(bandsArr);

    Gdal.close(tifDataset);

    // ! Keeping this here just in case
    // // TODO: support multiple urls
    // const tiff = await fromUrl(
    //   'https://s2downloads.eox.at/demo/EOxCloudless/2020/rgbnir/s2cloudless2020-16bits_sinlge-file_z0-4.tif'
    // );
    // const image = await tiff.getImage();

    // const count = await tiff.getImageCount();
    // // This returns the number of bands
    // const sample = image.getSamplesPerPixel()

    // console.log('sample', sample)
    // console.log('count', count);
    // console.log('image', image);
  };

  const handleOk = () => {
    if (!layer.parameters) {
      return;
    }

    let colorExpr: ExpressionValue[] = [];

    // TODO: Different viewers will have different types
    switch (selectedFunctionRef.current) {
      case 'linear': {
        colorExpr = ['interpolate', ['linear']];

        colorExpr.push(['band', selectedBand]);

        rowsRef.current?.map(stop => {
          colorExpr.push(stop.value);
          colorExpr.push(stop.color);
        });

        break;
      }
      case 'discrete': {
        colorExpr = ['case'];

        rowsRef.current?.map(stop => {
          colorExpr.push(['<=', ['band', selectedBand], stop.value]);
          colorExpr.push(stop.color);
        });

        // fallback value
        colorExpr.push([0, 0, 0]);
        break;
      }
      case 'exact': {
        colorExpr = ['case'];

        rowsRef.current?.map(stop => {
          colorExpr.push(['==', ['band', selectedBand], stop.value]);
          colorExpr.push(stop.color);
        });

        // fallback value
        colorExpr.push([0, 0, 0]);
        break;
      }
    }
    layer.parameters.color = colorExpr;

    context.model.sharedModel.updateLayer(layerId, layer);
    cancel();
  };

  okSignalPromise.promise.then(okSignal => {
    okSignal.connect(handleOk);
  });

  const addStopRow = () => {
    setStopRows([
      {
        value: 0,
        color: [0, 0, 0]
      },
      ...stopRows
    ]);
  };

  const deleteStopRow = (index: number) => {
    const newFilters = [...stopRows];
    newFilters.splice(index, 1);

    setStopRows(newFilters);
  };

  return (
    <div className="jp-gis-layer-symbology-container">
      <div className="jp-gis-band-container">
        {bandRows.length === 0 ? (
          <FontAwesomeIcon icon={faSpinner} />
        ) : (
          <BandRow
            index={0}
            bandRow={bandRows[0]}
            bandRows={bandRows}
            setSelectedBand={setSelectedBand}
          />
        )}
      </div>
      <div className="jp-gis-symbology-row">
        <label htmlFor="function-select">Interpolation:</label>
        <div className="jp-select-wrapper">
          <select
            name="function-select"
            id="function-select"
            className="jp-mod-styled"
            value={selectedFunction}
            style={{ textTransform: 'capitalize' }}
            onChange={event => {
              setSelectedFunction(event.target.value as interpolationType);
            }}
          >
            {functions.map((func, funcIndex) => (
              <option
                key={func}
                value={func}
                style={{ textTransform: 'capitalize' }}
              >
                {func}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="jp-gis-stop-container">
        <div className="jp-gis-stop-labels" style={{ display: 'flex', gap: 6 }}>
          <span style={{ flex: '0 0 18%' }}>
            Value{' '}
            {selectedFunction === 'discrete'
              ? '<='
              : selectedFunction === 'exact'
                ? '='
                : ''}
          </span>
          <span>Output Value</span>
        </div>
        {stopRows.map((stop, index) => (
          <StopRow
            key={`${index}-${stop.color}`}
            index={index}
            value={stop.value}
            outputValue={stop.color}
            stopRows={stopRows}
            setStopRows={setStopRows}
            deleteRow={() => deleteStopRow(index)}
          />
        ))}
      </div>
      <div className="jp-gis-symbology-button-container">
        <Button
          className="jp-Dialog-button jp-mod-accept jp-mod-styled"
          onClick={addStopRow}
        >
          Add Stop
        </Button>
        {/* <Button onClick={handleSubmit}>Submit</Button> */}
      </div>
    </div>
  );
};

export default SingleBandPseudoColor;