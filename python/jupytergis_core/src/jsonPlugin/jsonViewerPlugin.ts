import {
  ICollaborativeDrive,
  SharedDocumentFactory
} from '@jupyter/docprovider';
import {
  IJGISExternalCommandRegistry,
  IJGISExternalCommandRegistryToken,
  IJupyterGISDocTracker,
  IJupyterGISWidget
} from '@jupytergis/schema';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IThemeManager, WidgetTracker } from '@jupyterlab/apputils';
import { logoIcon, logoMiniIcon } from '@jupytergis/base';
import { JupyterGISWidgetFactory } from '../factory';
import { JupyterGISJsonModelFactory } from './modelFactory';
import { JupyterGisJsonDoc } from './jsonModel';

const FACTORY = 'JupyterGIS JSON Viewer';

const activate = (
  app: JupyterFrontEnd,
  tracker: WidgetTracker<IJupyterGISWidget>,
  themeManager: IThemeManager,
  externalCommandRegistry: IJGISExternalCommandRegistry,
  drive: ICollaborativeDrive | null
): void => {
  const widgetFactory = new JupyterGISWidgetFactory({
    name: FACTORY,
    modelName: 'jupytergis-jsonmmodel',
    fileTypes: ['json'],
    defaultFor: ['json'],
    tracker,
    commands: app.commands,
    externalCommandRegistry,
    drive
  });
  // Registering the widget factory
  app.docRegistry.addWidgetFactory(widgetFactory);

  // Creating and registering the model factory for our custom DocumentModel
  const modelFactory = new JupyterGISJsonModelFactory();
  app.docRegistry.addModelFactory(modelFactory);
  // register the filetype
  app.docRegistry.addFileType({
    name: 'json',
    displayName: 'JSON',
    mimeTypes: ['text/json'],
    extensions: ['.json', '.JSON'],
    fileFormat: 'text',
    contentType: 'json',
    icon: logoMiniIcon
  });

  const jsonSharedModelFactory: SharedDocumentFactory = () => {
    return new JupyterGisJsonDoc();
  };

  if (drive) {
    drive.sharedModelFactory.registerDocumentFactory(
      'json',
      jsonSharedModelFactory
    );
  }

  widgetFactory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = logoIcon;
    widget.context.pathChanged.connect(() => {
      tracker.save(widget);
    });
    themeManager.themeChanged.connect((_, changes) =>
      widget.context.model.themeChanged.emit(changes)
    );
    tracker.add(widget);
    app.shell.activateById('jupytergis::leftControlPanel');
    app.shell.activateById('jupytergis::rightControlPanel');
  });
  console.log('widgetFactory.name', widgetFactory.name);

  console.log('json viewer loaded');
};

const jsonPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterGIS:jsonplugin',
  requires: [
    IJupyterGISDocTracker,
    IThemeManager,
    IJGISExternalCommandRegistryToken
  ],
  optional: [ICollaborativeDrive],
  autoStart: true,
  activate
};

export default jsonPlugin;
