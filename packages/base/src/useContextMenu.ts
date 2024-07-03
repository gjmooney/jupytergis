import { IJGISLayer, IJupyterGISModel } from '@jupytergis/schema';
import { CommandRegistry } from '@lumino/commands';
import { ContextMenu } from '@lumino/widgets';
import {
  ChangeEvent,
  KeyboardEvent,
  RefObject,
  useEffect,
  useState
} from 'react';

export function useContextMenu(
  ref: RefObject<HTMLElement>,
  layer: IJGISLayer,
  layerId: string,
  gisModel: IJupyterGISModel | undefined
) {
  const [renameText, setRenameText] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    const open = (e: MouseEvent) => {
      console.log('in the event listener', e);
      e.preventDefault();
      e.stopPropagation();
      contextMenu.open(e);
    };

    if (ref.current) {
      console.log('event handling');
      ref.current.addEventListener('contextmenu', open);
    }

    return () => {
      if (ref.current) {
        ref.current.removeEventListener('contextmenu', open);
      }
    };
  }, [ref]);

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
      gisModel?.removeLayerTest(layerId, layer);
      console.log('gisModel?.getLayerTree()', gisModel?.getLayerTree());
    }
  });

  const contextMenu = new ContextMenu({ commands });

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
