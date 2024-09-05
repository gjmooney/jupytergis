import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IJupyterGISModel, IWebGlLayer } from '@jupytergis/schema';
import { Dialog } from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { Button } from '@jupyterlab/ui-components';
import { PromiseDelegate } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import initGdalJs from 'gdal3.js';
import { ExpressionValue } from 'ol/expr/expression';
import React, { useEffect, useRef, useState } from 'react';
import BandRow from './components/color-expression/BandRow';
import StopRow from './components/color-expression/StopRow';

interface IZoomColorProps {
  context: DocumentRegistry.IContext<IJupyterGISModel>;
  state: IStateDB;
  okSignalPromise: PromiseDelegate<Signal<ColorExprWidget, null>>;
  cancel: () => void;
}

export interface IStopRow {
  value: number;
  color: any;
}

export interface IBandRow {
  band: number;
  colorInterpretation: string;
}

const ColorExpressionDialog = ({
  context,
  state,
  okSignalPromise,
  cancel
}: IZoomColorProps) => {
  const functions = ['discrete', 'linear', 'exact'];
  const rowsRef = useRef<IStopRow[]>();
  const selectedLayerRef = useRef<string>('');
  const [selectedFunction, setSelectedFunction] = useState('linear');
  const [selectedLayer, setSelectedLayer] = useState('');
  const [selectedBand, setSelectedBand] = useState(1);
  const [stopRows, setStopRows] = useState<IStopRow[]>([]);
  const [bandRows, setBandRows] = useState<IBandRow[]>([]);

  useEffect(() => {
    const handleClientStateChanged = () => {
      if (!context.model.localState?.selected?.value) {
        return;
      }

      // TODO: handle multi select better
      const currentLayer = Object.keys(
        context.model.localState?.selected?.value
      )[0];

      setSelectedLayer(currentLayer);
    };

    // set the layer on initial render
    handleClientStateChanged();

    context.model.clientStateChanged.connect(handleClientStateChanged);
  }, []);

  const getBandInfo = async () => {
    const bandsArr: IBandRow[] = [];

    const tifDataState = await state.fetch(selectedLayer);
    if (tifDataState) {
      const tifData = JSON.parse(tifDataState['tifData']);

      tifData['info']['bands'].forEach(bandData => {
        bandsArr.push({
          band: bandData.band,
          colorInterpretation: bandData.colorInterpretation
        });
      });
      setBandRows(bandsArr);

      return;
    }

    const layer = context.model.getLayer(selectedLayer);
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
    const tifDatasetInfo = await Gdal.gdalinfo(tifDataset);

    tifDatasetInfo['bands'].forEach(bandData => {
      bandsArr.push({
        band: bandData.band,
        colorInterpretation: bandData.colorInterpretation
      });
    });

    state.save(selectedLayer, JSON.stringify(tifDatasetInfo));
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

  useEffect(() => {
    // This it to parse a color object on the layer
    selectedLayerRef.current = selectedLayer;

    const layer = context.model.getLayer(selectedLayer);
    if (!layer || !layer.parameters?.color) {
      return;
    }

    const color = layer.parameters.color;

    // If color is a string we don't need to parse
    if (typeof color === 'string') {
      return;
    }
    const pairedObjects: IStopRow[] = [];

    // So if it's not a string then it's an array and we parse
    // First element is function (ie interpolate)
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

    setStopRows(pairedObjects);

    // setTifData(undefined);300
    getBandInfo();
  }, [selectedLayer]);

  useEffect(() => {
    rowsRef.current = stopRows;
  }, [stopRows]);

  useEffect(() => {
    console.log('bandRows', bandRows);
  }, [bandRows]);

  useEffect(() => {
    console.log('selectedBand', selectedBand);
  }, [selectedBand]);

  const handleOk = () => {
    const layer = context.model.getLayer(selectedLayer);
    if (!layer || !layer.parameters) {
      return;
    }

    const colorExpr: ExpressionValue = ['interpolate', [selectedFunction]];

    colorExpr.push(['band', selectedBand]);

    rowsRef.current?.map(stop => {
      colorExpr.push(stop.value);
      colorExpr.push(stop.color);
    });

    (layer.parameters as IWebGlLayer).color = colorExpr;
    context.model.sharedModel.updateLayer(selectedLayerRef.current, layer);
    cancel();
  };

  okSignalPromise.promise.then(okSignal => {
    okSignal.connect(handleOk);
  });

  const addStopRow = () => {
    setStopRows([
      ...stopRows,
      {
        value: 0,
        color: [0, 0, 0]
      }
    ]);
  };

  return (
    <div className="jp-gis-color-container">
      <div className="band container">
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
      <div className="funcion select">
        <label htmlFor="function-select">Interpolation</label>
        <select
          name="function-select"
          id="function-select"
          value={selectedFunction}
          onChange={event => {
            setSelectedFunction(event.target.value);
          }}
        >
          {functions.map((func, funcIndex) => (
            <option key={func} value={func}>
              {func}
            </option>
          ))}
        </select>
      </div>
      <div className="stop container">
        <div className="labels" style={{ display: 'flex', gap: 6 }}>
          <span style={{ flex: '0 0 18%' }}>Value</span>
          <span>Output Value</span>
        </div>
        {stopRows.map((stop, index) => (
          <StopRow
            index={index}
            value={stop.value}
            outputValue={stop.color}
            stopRows={stopRows}
            setStopRows={setStopRows}
          />
        ))}
      </div>
      <div className="bottom buttons">
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

export interface IZoomColorOptions {
  context: DocumentRegistry.IContext<IJupyterGISModel>;
  state: IStateDB;
}

export class ColorExprWidget extends Dialog<boolean> {
  private okSignal: Signal<ColorExprWidget, null>;
  private state: IStateDB;

  constructor(options: IZoomColorOptions) {
    const cancelCallback = () => {
      this.resolve(0);
    };

    const okSignalPromise = new PromiseDelegate<
      Signal<ColorExprWidget, null>
    >();

    const body = (
      <ColorExpressionDialog
        context={options.context}
        okSignalPromise={okSignalPromise}
        cancel={cancelCallback}
        state={options.state}
      />
    );

    super({ title: 'Color Expression', body });

    this.id = 'jupytergis::zoomzoom';

    this.okSignal = new Signal(this);
    okSignalPromise.resolve(this.okSignal);
  }

  resolve(index?: number): void {
    if (index === 0) {
      super.resolve(index);
    }

    if (index === 1) {
      this.okSignal.emit(null);
    }
  }
}

export default ColorExpressionDialog;
