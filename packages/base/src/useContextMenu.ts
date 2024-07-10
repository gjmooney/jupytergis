import {
  IJGISLayer,
  IJGISLayerGroup,
  IJupyterGISModel
} from '@jupytergis/schema';
import { CommandRegistry } from '@lumino/commands';
import { ContextMenu } from '@lumino/widgets';
import {
  ChangeEvent,
  KeyboardEvent,
  RefObject,
  useEffect,
  useState
} from 'react';

export function useContextMenu(ref: RefObject<HTMLElement>, contextMenu) {
  useEffect(() => {
    const open = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      contextMenu.open(e);
    };

    if (ref.current) {
      ref.current.addEventListener('contextmenu', open);
    }

    return () => {
      if (ref.current) {
        ref.current.removeEventListener('contextmenu', open);
      }
    };
  }, [ref]);
}

export function createLayerContextMenu(
  ref: RefObject<HTMLElement>,
  layer: IJGISLayer,
  layerId: string,
  gisModel: IJupyterGISModel | undefined
) {
  const [renameText, setRenameText] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const commands = new CommandRegistry();

  commands.addCommand('rename-layer', {
    label: 'Rename Layer',
    mnemonic: 1,
    execute: () => {
      setIsRenaming(true);
    }
  });
  commands.addCommand('remove-layer', {
    label: 'Remove Layer',
    mnemonic: 1,
    execute: () => {
      console.log('removing', layerId);
      gisModel?.sharedModel.removeLayer(layerId);
      console.log('gisModel?.getLayerTree()', gisModel?.getLayerTree());
    }
  });

  const contextMenu = new ContextMenu({ commands });
  useContextMenu(ref, contextMenu);

  contextMenu.addItem({
    command: 'rename-layer',
    selector: '.jp-gis-layerTitle',
    rank: 1
  });

  contextMenu.addItem({
    command: 'remove-layer',
    selector: '.jp-gis-layerTitle',
    rank: 1
  });

  const handleRenameInput = (event: ChangeEvent<HTMLInputElement>) => {
    setRenameText(event.target.value.toLowerCase());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log('enter', renameText);
      layer.name = renameText;
      gisModel?.sharedModel.updateLayer(layerId, layer);
      setIsRenaming(false);
    }
  };

  return {
    isRenaming,
    handleRenameInput,
    handleKeyDown
  };
}

export function createGroupContextMenu(
  ref: RefObject<HTMLElement>,
  group: IJGISLayerGroup,
  gisModel: IJupyterGISModel | undefined
) {
  const [renameText, setRenameText] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRenameInput = (event: ChangeEvent<HTMLInputElement>) => {
    setRenameText(event.target.value.toLowerCase());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log('enter', renameText);
      gisModel?.renameLayerGroup(group.name, renameText);
      group.name = renameText;
      // console.log('group index in key down ', t, s);
      // gisModel?.sharedModel.updateLayerTreeItem(t, s);
      setIsRenaming(false);
    }
  };

  const commands = new CommandRegistry();

  commands.addCommand('rename-group', {
    label: 'Rename Group',
    mnemonic: 1,
    execute: () => {
      setIsRenaming(true);
    }
  });
  commands.addCommand('remove-group', {
    label: 'Remove Group',
    mnemonic: 1,
    execute: () => {
      gisModel?.removeLayerGroup(group.name);
    }
  });

  const contextMenu = new ContextMenu({ commands });
  useContextMenu(ref, contextMenu);

  contextMenu.addItem({
    command: 'rename-group',
    selector: '.jp-gis-layerGroupHeader',
    rank: 2
  });

  contextMenu.addItem({
    command: 'remove-group',
    selector: '.jp-gis-layerGroupHeader',
    rank: 2
  });

  return {
    isRenaming,
    handleRenameInput,
    handleKeyDown
  };
}
