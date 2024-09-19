import { PageConfig } from '@jupyterlab/coreutils';
import initGdalJs from 'gdal3.js';

let Gdal: Gdal;

async function initializeGdal(): Promise<void> {
  try {
    const baseUrl = PageConfig.getBaseUrl();

    Gdal = await initGdalJs({
      path: baseUrl + 'lab/extensions/@jupytergis/jupytergis-core/static',
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
