import React, { useEffect, useState } from 'react';
import BandRendering from './BandRendering';
import { ISymbologyDialogProps } from './colorExpressionDialog';

const SymbologyDialog = ({
  context,
  state,
  okSignalPromise,
  cancel
}: ISymbologyDialogProps) => {
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [componentToRender, setComponentToRender] = useState<any>(null);

  let LayerSymbology;

  useEffect(() => {
    const handleClientStateChanged = () => {
      if (!context.model.localState?.selected?.value) {
        return;
      }

      const currentLayer = Object.keys(
        context.model.localState.selected.value
      )[0];

      setSelectedLayer(currentLayer);
    };

    // Initial state
    handleClientStateChanged();

    context.model.clientStateChanged.connect(handleClientStateChanged);

    return () => {
      context.model.clientStateChanged.disconnect(handleClientStateChanged);
    };
  }, []);

  useEffect(() => {
    if (!selectedLayer) {
      return;
    }

    const layer = context.model.getLayer(selectedLayer);

    if (!layer) {
      return;
    }

    switch (layer.type) {
      case 'WebGlLayer':
        LayerSymbology = (
          <BandRendering
            context={context}
            state={state}
            okSignalPromise={okSignalPromise}
            cancel={cancel}
            layerId={selectedLayer}
          />
        );
        break;
      default:
        LayerSymbology = <div>Layer Not Supported</div>;
    }
    setComponentToRender(LayerSymbology);
  }, [selectedLayer]);

  return <>{componentToRender}</>;
};

export default SymbologyDialog;
