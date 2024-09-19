import { PageConfig } from '@jupyterlab/coreutils';
import initGdalJs from 'gdal3.js';

let Gdal: Gdal;

async function initializeGdal(): Promise<void> {
  try {
    const baseUrl = PageConfig.getBaseUrl();

    let staticPath = 'extensions/@jupytergis/jupytergis-core/static';

    //@ts-expect-error checking if lab or lite
    if (window._JUPYTERLAB['@jupyterlite/xeus']) {
      console.log('lite');
    } else {
      console.log('lab');
      staticPath = 'lab/' + staticPath;
    }

    Gdal = await initGdalJs({
      path: baseUrl + staticPath,
      useWorker: false
    });
  } catch (error) {
    console.error('Failed to initialize GDAL.js:', error);
    throw error;
  }
}

// Immediately invoke the function
initializeGdal().catch(error => {
  console.error('Error initializing GDAL.js:', error);
});

export { Gdal };
