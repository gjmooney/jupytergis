import { IJGISLayer } from '@jupytergis/schema';
import { IStopRow } from '../../symbologyDialog';

export namespace VectorUtils {
  export const buildColorInfo = (layer: IJGISLayer) => {
    // This it to parse a color object on the layer
    if (!layer.parameters?.color) {
      return [];
    }

    const color = layer.parameters.color;

    // If color is a string we don't need to parse
    if (typeof color === 'string') {
      return [];
    }

    const prefix = layer.parameters.type === 'circle' ? 'circle-' : '';

    if (!color[`${prefix}fill-color`]) {
      return [];
    }

    const valueColorPairs: IStopRow[] = [];

    // So if it's not a string then it's an array and we parse
    // Color[0] is the operator used for the color expression
    switch (color[`${prefix}fill-color`][0]) {
      case 'interpolate': {
        // First element is interpolate for linear selection
        // Second element is type of interpolation (ie linear)
        // Third is input value that stop values are compared with
        // Fourth and on is value:color pairs
        for (let i = 3; i < color[`${prefix}fill-color`].length; i += 2) {
          const obj: IStopRow = {
            stop: color[`${prefix}fill-color`][i],
            output: color[`${prefix}fill-color`][i + 1]
          };
          valueColorPairs.push(obj);
        }
        break;
      }
    }

    return valueColorPairs;
  };
}
