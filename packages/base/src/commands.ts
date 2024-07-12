import { JupyterFrontEnd } from '@jupyterlab/application';
import { WidgetTracker } from '@jupyterlab/apputils';
import { ITranslator } from '@jupyterlab/translation';
import { redoIcon, undoIcon } from '@jupyterlab/ui-components';

import {
  IJGISFormSchemaRegistry,
  IJGISLayerBrowserRegistry,
  IJupyterGISModel,
  SelectionType
} from '@jupytergis/schema';

import { LayerBrowserWidget } from './layerBrowser/layerBrowserDialog';
import { JupyterGISWidget } from './widget';

/**
 * Add the commands to the application's command registry.
 */
export function addCommands(
  app: JupyterFrontEnd,
  tracker: WidgetTracker<JupyterGISWidget>,
  translator: ITranslator,
  formSchemaRegistry: IJGISFormSchemaRegistry,
  layerBrowserRegistry: IJGISLayerBrowserRegistry
): void {
  Private.updateFormSchema(formSchemaRegistry);
  const trans = translator.load('jupyterlab');
  const { commands } = app;

  commands.addCommand(CommandIDs.redo, {
    label: trans.__('Redo'),
    isEnabled: () => {
      return tracker.currentWidget
        ? tracker.currentWidget.context.model.sharedModel.editable
        : false;
    },
    execute: args => {
      const current = tracker.currentWidget;

      if (current) {
        return current.context.model.sharedModel.redo();
      }
    },
    icon: redoIcon
  });

  commands.addCommand(CommandIDs.undo, {
    label: trans.__('Undo'),
    isEnabled: () => {
      return tracker.currentWidget
        ? tracker.currentWidget.context.model.sharedModel.editable
        : false;
    },
    execute: args => {
      const current = tracker.currentWidget;

      if (current) {
        return current.context.model.sharedModel.undo();
      }
    },
    icon: undoIcon
  });

  commands.addCommand(CommandIDs.openLayerBrowser, {
    label: trans.__('Open Layer Browser'),
    isEnabled: () => {
      return tracker.currentWidget
        ? tracker.currentWidget.context.model.sharedModel.editable
        : false;
    },
    iconClass: 'fa fa-book-open',
    execute: Private.createLayerBrowser(
      tracker,
      layerBrowserRegistry,
      formSchemaRegistry
    )
  });

  commands.addCommand(CommandIDs.removeLayer, {
    label: trans.__('Remove Layer'),
    execute: () => {
      const model = tracker.currentWidget?.context.model;
      Private.removeSelectedItems(model, 'layer', selection => {
        model?.sharedModel.removeLayer(selection);
      });
    }
  });

  commands.addCommand(CommandIDs.renameLayer, {
    label: trans.__('Rename Layer'),
    execute: async () => {
      const model = tracker.currentWidget?.context.model;
      await Private.renameSelectedItem(model, 'layer', (layerId, newName) => {
        const layer = model?.getLayer(layerId);
        if (layer) {
          layer.name = newName;
          model?.sharedModel.updateLayer(layerId, layer);
        }
      });
    }
  });

  commands.addCommand(CommandIDs.removeGroup, {
    label: trans.__('Remove Group'),
    execute: async () => {
      const model = tracker.currentWidget?.context.model;
      Private.removeSelectedItems(model, 'group', selection => {
        model?.removeLayerGroup(selection);
      });
    }
  });

  commands.addCommand(CommandIDs.renameGroup, {
    label: trans.__('Rename Group'),
    execute: async () => {
      const model = tracker.currentWidget?.context.model;
      await Private.renameSelectedItem(model, 'group', (groupName, newName) => {
        model?.renameLayerGroup(groupName, newName);
      });
    }
  });

  app.contextMenu.addItem({
    command: CommandIDs.removeLayer,
    selector: '.jp-gis-layerTitle',
    rank: 1
  });

  app.contextMenu.addItem({
    command: CommandIDs.renameLayer,
    selector: '.jp-gis-layerTitle',
    rank: 1
  });

  app.contextMenu.addItem({
    command: CommandIDs.removeGroup,
    selector: '.jp-gis-layerGroupHeader',
    rank: 1
  });

  app.contextMenu.addItem({
    command: CommandIDs.renameGroup,
    selector: '.jp-gis-layerGroupHeader',
    rank: 1
  });
}

/**
 * The command IDs.
 */
export namespace CommandIDs {
  export const redo = 'jupytergis:redo';
  export const undo = 'jupytergis:undo';

  export const openLayerBrowser = 'jupytergis:openLayerBrowser';

  export const renameLayer = 'jupytergis:renameLayer';
  export const removeLayer = 'jupytergis:removeLayer';
  export const renameGroup = 'jupytergis:renameGroup';
  export const removeGroup = 'jupytergis:removeGroup';
}

namespace Private {
  export const FORM_SCHEMA = {};

  export function updateFormSchema(
    formSchemaRegistry: IJGISFormSchemaRegistry
  ) {
    if (Object.keys(FORM_SCHEMA).length > 0) {
      return;
    }
    const formSchema = formSchemaRegistry.getSchemas();
    formSchema.forEach((val, key) => {
      const value = (FORM_SCHEMA[key] = JSON.parse(JSON.stringify(val)));
      value['required'] = ['name', ...value['required']];
      value['properties'] = {
        name: { type: 'string', description: 'The name of the layer/source' },
        ...value['properties']
      };
    });
  }

  export function createLayerBrowser(
    tracker: WidgetTracker<JupyterGISWidget>,
    layerBrowserRegistry: IJGISLayerBrowserRegistry,
    formSchemaRegistry: IJGISFormSchemaRegistry
  ) {
    return async () => {
      const current = tracker.currentWidget;

      if (!current) {
        return;
      }

      const dialog = new LayerBrowserWidget({
        model: current.context.model,
        registry: layerBrowserRegistry.getRegistryLayers(),
        formSchemaRegistry
      });
      await dialog.launch();
    };
  }

  export async function getUserInputForRename(
    text: HTMLElement,
    input: HTMLInputElement,
    original: string
  ): Promise<string> {
    const parent = text.parentElement as HTMLElement;
    parent.replaceChild(input, text);
    input.focus();

    return new Promise<string>(resolve => {
      input.addEventListener('blur', () => {
        parent.replaceChild(text, input);
        resolve(input.value);
      });

      input.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.stopPropagation();
          event.preventDefault();
          input.blur();
        } else if (event.key === 'Escape') {
          event.stopPropagation();
          event.preventDefault();
          input.value = original;
          input.blur();
          text.focus();
        }
      });
    });
  }

  export function removeSelectedItems(
    model: IJupyterGISModel | undefined,
    itemTypeToRemove: SelectionType,
    removeFunction: (id: string) => void
  ) {
    const selected = model?.localState?.selected.value;

    if (!selected) {
      console.info('Nothing selected');
      return;
    }

    for (const selection in selected) {
      if (selected[selection].type === itemTypeToRemove) {
        removeFunction(selection);
      }
    }
  }

  export async function renameSelectedItem(
    model: IJupyterGISModel | undefined,
    itemType: SelectionType,
    callback: (itemId: string, newName: string) => void
  ) {
    const selectedItems = model?.localState?.selected.value;

    if (!selectedItems) {
      console.error(`No ${itemType} selected`);
      return;
    }

    let itemId = '';

    // If more then one item is selected, only rename the first
    for (const id in selectedItems) {
      if (selectedItems[id].type === itemType) {
        itemId = id;
        break;
      }
    }

    if (!itemId) {
      return;
    }

    const nodeId = selectedItems[itemId].selectedNodeId;
    if (!nodeId) {
      return;
    }

    const node = document.getElementById(nodeId);
    if (!node) {
      console.warn(`Node with ID ${nodeId} not found`);
      return;
    }

    const edit = document.createElement('input');
    edit.classList.add('jp-gis-left-panel-input');
    const originalName = node.innerText;
    const newName = await Private.getUserInputForRename(
      node,
      edit,
      originalName
    );

    if (newName.trim() === '') {
      console.warn('New name cannot be empty');
      return;
    }

    if (newName !== originalName) {
      callback(itemId, newName);
    }
  }
}
