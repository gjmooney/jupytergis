import jgisPlugin from './jgisplugin/plugins';
import jsonPlugin from './jsonPlugin/jsonViewerPlugin';
import {
  externalCommandRegistryPlugin,
  formSchemaRegistryPlugin,
  layerBrowserRegistryPlugin,
  trackerPlugin
} from './plugin';

export * from './factory';
export default [
  trackerPlugin,
  jgisPlugin,
  jsonPlugin,
  formSchemaRegistryPlugin,
  externalCommandRegistryPlugin,
  layerBrowserRegistryPlugin
];
