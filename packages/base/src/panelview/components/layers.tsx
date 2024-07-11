import {
  IJGISLayerGroup,
  IJGISLayerTree,
  IJupyterGISClientState,
  IJupyterGISModel,
  ISelection
} from '@jupytergis/schema';
import {
  Button,
  LabIcon,
  ReactWidget,
  caretDownIcon
} from '@jupyterlab/ui-components';
import { Panel } from '@lumino/widgets';
import React, { useEffect, useRef, useState } from 'react';
import { nonVisibilityIcon, rasterIcon, visibilityIcon } from '../../icons';
import { IControlPanelModel } from '../../types';
import {
  createGroupContextMenu,
  createLayerContextMenu
} from '../../useContextMenu';

const LAYERS_PANEL_CLASS = 'jp-gis-layerPanel';
const LAYER_GROUP_CLASS = 'jp-gis-layerGroup';
const LAYER_GROUP_HEADER_CLASS = 'jp-gis-layerGroupHeader';
const LAYER_GROUP_COLLAPSER_CLASS = 'jp-gis-layerGroupCollapser';
const LAYER_ITEM_CLASS = 'jp-gis-layerItem';
const LAYER_CLASS = 'jp-gis-layer';
const LAYER_TITLE_CLASS = 'jp-gis-layerTitle';
const LAYER_ICON_CLASS = 'jp-gis-layerIcon';

/**
 * The namespace for the layers panel.
 */
export namespace LayersPanel {
  /**
   * Options of the layers panel widget.
   */
  export interface IOptions {
    model: IControlPanelModel;
  }
}

/**
 * The layers panel widget.
 */
export class LayersPanel extends Panel {
  constructor(options: LayersPanel.IOptions) {
    super();
    // this._contextMenu = createLayerPanelContextMenu();
    this._model = options.model;
    this.id = 'jupytergis::layerTree';
    // this.node.addEventListener('contextmenu', e => {
    //   console.log('in the event listener', e);
    //   e.preventDefault();
    //   e.stopPropagation();
    //   this._contextMenu.open(e);
    // });
    this.addClass(LAYERS_PANEL_CLASS);
    this.addWidget(
      ReactWidget.create(
        <LayersBodyComponent
          model={this._model}
          onSelect={this._onSelect}
        ></LayersBodyComponent>
      )
    );
  }

  /**
   * Function to call when a layer is selected from a component of the panel.
   *
   * @param layer - the selected layer.
   */
  private _onSelect = (layer?: string) => {
    if (this._model) {
      const selection: { [key: string]: ISelection } = {};
      if (layer) {
        selection[layer] = {
          type: 'layer'
        };
      }
      this._model?.jGISModel?.syncSelected(selection, this.id);
    }
  };

  private _model: IControlPanelModel | undefined;
  // private _contextMenu: ContextMenu;
}

/**
 * Properties of the layers body component.
 */
interface IBodyProps {
  model: IControlPanelModel;
  onSelect: (layer?: string) => void;
}

/**
 * The body component of the panel.
 */
function LayersBodyComponent(props: IBodyProps): JSX.Element {
  const [model, setModel] = useState<IJupyterGISModel | undefined>(
    props.model?.jGISModel
  );
  const [layerTree, setLayerTree] = useState<IJGISLayerTree>(
    model?.getLayerTree() || []
  );

  /**
   * Propagate the layer selection.
   */
  const onItemClick = (item?: string) => {
    props.onSelect(item);
  };

  /**
   * Listen to the layers and layer tree changes.
   */
  useEffect(() => {
    const updateLayers = () => {
      console.log('in update layer tree');
      setLayerTree(model?.getLayerTree() || []);
    };
    model?.sharedModel.layersChanged.connect(updateLayers);
    model?.sharedModel.layerTreeChanged.connect(updateLayers);

    return () => {
      model?.sharedModel.layersChanged.disconnect(updateLayers);
      model?.sharedModel.layerTreeChanged.disconnect(updateLayers);
    };
  }, [model]);

  /**
   * Update the model when it changes.
   */
  props.model?.documentChanged.connect((_, widget) => {
    setModel(widget?.context.model);
    setLayerTree(widget?.context.model?.getLayerTree() || []);
  });

  return (
    <div>
      {layerTree.map(layer =>
        typeof layer === 'string' ? (
          <LayerComponent
            gisModel={model}
            layerId={layer}
            onClick={onItemClick}
          />
        ) : (
          <LayerGroupComponent
            gisModel={model}
            group={layer}
            onClick={onItemClick}
          />
        )
      )}
    </div>
  );
}

/**
 * Properties of the layer group component.
 */
interface ILayerGroupProps {
  gisModel: IJupyterGISModel | undefined;
  group: IJGISLayerGroup | undefined;
  onClick: (item?: string) => void;
}

/**
 * The component to handle group of layers.
 */
function LayerGroupComponent(props: ILayerGroupProps): JSX.Element {
  const myRef = useRef<HTMLDivElement>(null);
  const { group, gisModel } = props;
  if (group === undefined) {
    return <></>;
  }
  const [open, setOpen] = useState<boolean>(false);
  const name = group?.name ?? 'Undefined group';
  const layers = group?.layers ?? [];

  useEffect(() => {
    console.log('myRef', myRef);
    console.log(myRef.current);
  }, [myRef, myRef.current]);

  const { isRenaming, handleKeyDown, handleRenameInput } =
    createGroupContextMenu(myRef, group, gisModel);

  return (
    <div className={`${LAYER_ITEM_CLASS} ${LAYER_GROUP_CLASS}`}>
      {isRenaming ? (
        <input
          type="text"
          onChange={handleRenameInput}
          onKeyDown={handleKeyDown}
          autoFocus
          // onBlur={() => setIsEditing(false)}
        />
      ) : (
        <div
          ref={myRef}
          onClick={() => setOpen(!open)}
          className={LAYER_GROUP_HEADER_CLASS}
        >
          <LabIcon.resolveReact
            icon={caretDownIcon}
            className={
              LAYER_GROUP_COLLAPSER_CLASS + (open ? ' jp-mod-expanded' : '')
            }
            tag={'span'}
          />
          <span>{name}</span>
        </div>
      )}
      {open && (
        <div>
          {layers.map(layer =>
            typeof layer === 'string' ? (
              <LayerComponent
                gisModel={gisModel}
                layerId={layer}
                onClick={props.onClick}
              />
            ) : (
              <LayerGroupComponent
                gisModel={gisModel}
                group={layer}
                onClick={props.onClick}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Properties of the layer component.
 */
interface ILayerProps {
  gisModel: IJupyterGISModel | undefined;
  layerId: string;
  onClick: (item?: string) => void;
}

function isSelected(layerId: string, model: IJupyterGISModel | undefined) {
  return (
    (model?.localState?.selected?.value &&
      Object.keys(model?.localState?.selected?.value).includes(layerId)) ||
    false
  );
}

/**
 * The component to display a single layer.
 */
function LayerComponent(props: ILayerProps): JSX.Element {
  const { layerId, gisModel } = props;
  const layer = gisModel?.getLayer(layerId);
  if (layer === undefined) {
    return <></>;
  }
  const [selected, setSelected] = useState<boolean>(
    // TODO Support multi-selection as `model?.jGISModel?.localState?.selected.value` does
    isSelected(layerId, gisModel)
  );
  const name = layer.name;

  /**
   * Listen to the changes on the current layer.
   */
  useEffect(() => {
    const onClientSharedStateChanged = (
      sender: IJupyterGISModel,
      clients: Map<number, IJupyterGISClientState>
    ) => {
      // TODO Support follow mode and remoteUser state
      setSelected(isSelected(layerId, gisModel));
    };
    gisModel?.clientStateChanged.connect(onClientSharedStateChanged);

    return () => {
      gisModel?.clientStateChanged.disconnect(onClientSharedStateChanged);
    };
  }, [gisModel]);

  /**
   * Toggle layer visibility.
   */
  const toggleVisibility = () => {
    layer.visible = !layer.visible;
    gisModel?.sharedModel?.updateLayer(layerId, layer);
  };

  const myRef = useRef<HTMLDivElement>(null);

  const { isRenaming, handleRenameInput, handleKeyDown } =
    createLayerContextMenu(myRef, layer, layerId, gisModel);

  return (
    <div
      ref={myRef}
      className={`${LAYER_ITEM_CLASS} ${LAYER_CLASS}${selected ? ' jp-mod-selected' : ''}`}
    >
      {isRenaming ? (
        <div className={LAYER_TITLE_CLASS}>
          <LabIcon.resolveReact
            icon={rasterIcon}
            className={LAYER_ICON_CLASS}
          />
          <input
            type="text"
            onChange={handleRenameInput}
            onKeyDown={handleKeyDown}
            autoFocus
            // onBlur={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <>
          <div
            className={LAYER_TITLE_CLASS}
            onClick={() => props.onClick(layerId)}
          >
            {layer.type === 'RasterLayer' && (
              <LabIcon.resolveReact
                icon={rasterIcon}
                className={LAYER_ICON_CLASS}
              />
            )}
            <span>{name}</span>
          </div>
          <Button
            title={layer.visible ? 'Hide layer' : 'Show layer'}
            onClick={toggleVisibility}
            minimal
          >
            <LabIcon.resolveReact
              icon={layer.visible ? visibilityIcon : nonVisibilityIcon}
              className={LAYER_ICON_CLASS}
              tag="span"
            />
          </Button>
        </>
      )}
    </div>
  );
}
