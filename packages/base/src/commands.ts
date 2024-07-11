import { JupyterFrontEnd } from '@jupyterlab/application';
import { WidgetTracker } from '@jupyterlab/apputils';
import { ITranslator } from '@jupyterlab/translation';
import { redoIcon, undoIcon } from '@jupyterlab/ui-components';

import {
  IJGISFormSchemaRegistry,
  IJGISLayerBrowserRegistry
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
      const selected =
        tracker.currentWidget?.context.model.localState?.selected.value;

      if (selected) {
        Object.keys(selected).forEach(key => {
          tracker.currentWidget?.context.model.sharedModel.removeLayer(key);
        });
      }
    }
  });

  commands.addCommand(CommandIDs.renameLayer, {
    label: trans.__('Rename Layer'),
    execute: async () => {
      const model = tracker.currentWidget?.context.model;
      console.log('rename layer');

      const selectedLayers = model?.localState?.selected.value;

      if (!selectedLayers) {
        console.error('No layers selected');
        return;
      }

      // TODO: Probably don't want to rename multiple layers at a time actually
      for (const layerId in selectedLayers) {
        const layer = model.getLayer(layerId);
        const nodeId = selectedLayers[layerId].selectedNodeId;

        if (!layer || !nodeId) {
          continue;
        } // Skip if layer or nodeId is missing

        const node = document.getElementById(nodeId);
        if (!node) {
          console.warn(`Node with ID ${nodeId} not found`);
          continue;
        }

        const edit = document.createElement('input');
        edit?.classList.add('jp-gis-left-panel-input');
        const originalName = node.innerText;
        const newName = await Private.getUserInputForRename(
          node,
          edit,
          originalName
        );

        if (newName.trim() === '') {
          console.warn('New name cannot be empty');
          continue;
        }

        if (newName !== originalName) {
          layer.name = newName;
          model.sharedModel.updateLayer(layerId, layer);
        }
      }
    }
  });

  commands.addCommand(CommandIDs.removeGroup, {
    label: trans.__('Remove Group'),
    execute: async () => {
      const model = tracker.currentWidget?.context.model;
      const selected = model?.localState?.selected.value;

      if (!selected) {
        console.info('Nothing selected');
        return;
      }

      for (const selection in selected) {
        selected[selection].type === 'group' &&
          model.removeLayerGroup(selection);
      }
    }
  });

  commands.addCommand(CommandIDs.renameGroup, {
    label: trans.__('Rename Group'),
    execute: async () => {
      const model = tracker.currentWidget?.context.model;

      const selected = model?.localState?.selected.value;

      if (!selected) {
        console.error('No group selected');
        return;
      }

      // TODO: Probably don't want to rename multiple layers at a time actually
      console.log('test', selected);
      for (const selection in selected) {
        console.log('selection', selection);
        const nodeId = selected[selection].selectedNodeId;

        if (!nodeId) {
          continue;
        } // Skip if layer or nodeId is missing

        const node = document.getElementById(nodeId);
        if (!node) {
          console.warn(`Node with ID ${nodeId} not found`);
          continue;
        }

        const edit = document.createElement('input');
        edit?.classList.add('jp-gis-left-panel-input');
        const originalName = node.innerText;
        const newName = await Private.getUserInputForRename(
          node,
          edit,
          originalName
        );

        if (newName.trim() === '') {
          console.warn('New name cannot be empty');
          continue;
        }

        if (newName !== originalName) {
          model.renameLayerGroup(selection, newName);
        }
      }
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
}
