import { IDict, IStorySegmentLayer } from '@jupytergis/schema';
import { FieldProps } from '@rjsf/core';
import * as React from 'react';

import { LayerPropertiesForm } from './layerform';
import { ArrayFieldTemplate } from '../components/SegmentFormSymbology';
import StorySegmentReset from '../components/StorySegmentReset';

function extractLayerOverrideIndex(idSchema: {
  $id?: string;
}): number | undefined {
  const id = idSchema?.$id ?? '';
  const match = id.match(/layerOverride_(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

/** Inline field that shows sourceProperties formData for debugging. */
function SourcePropertiesDebug(props: FieldProps) {
  const context = props.formContext as
    | { formData?: IStorySegmentLayer }
    | undefined;
  const fullFormData = context?.formData;
  const index = extractLayerOverrideIndex(props.idSchema ?? {});
  const sourceProperties =
    index !== undefined && fullFormData?.layerOverride?.[index]
      ? fullFormData.layerOverride[index].sourceProperties
      : undefined;
  console.log('index', index);
  console.log('fullFormData', fullFormData);
  const model = props.formContext.model;
  const layerId = fullFormData?.layerOverride?.[index ?? 0].targetLayer;

  const layer = model.getLayer(layerId);
  const sourceID = layer?.parameters?.source;
  const source = model.getSource(sourceID);
  console.log('layer', layer);
  console.log('source', source);

  return React.createElement(
    'pre',
    {
      style: {
        fontSize: '0.75rem',
        padding: '0.5rem',
        background: 'var(--jp-layout-color2)',
        borderRadius: 4,
        overflow: 'auto',
      },
    },
    JSON.stringify(sourceProperties ?? null, null, 2),
  );
}

export class StorySegmentLayerPropertiesForm extends LayerPropertiesForm {
  protected processSchema(
    data: IStorySegmentLayer | undefined,
    schema: IDict,
    uiSchema: IDict,
  ) {
    super.processSchema(data, schema, uiSchema);

    if (!this.props.model.selected) {
      return;
    }

    let layerId: string | undefined = undefined;
    const selectedKeys = Object.keys(this.props.model.selected);

    // Find the first selected story segment
    // ! TODO we still need to handle selections better, like there should at least be a getFirstSelected
    for (const key of selectedKeys) {
      const layer = this.props.model.getLayer(key);
      if (layer && layer.type === 'StorySegmentLayer') {
        layerId = key;
        break;
      }
    }

    uiSchema['extent'] = {
      'ui:field': (props: FieldProps) =>
        React.createElement(StorySegmentReset, {
          ...props,
          model: this.props.model,
          layerId,
        }),
    };

    uiSchema['content'] = {
      ...uiSchema['content'],
      markdown: {
        'ui:widget': 'textarea',
        'ui:options': {
          rows: 10,
        },
      },
    };

    uiSchema['layerOverride'] = {
      ...uiSchema['layerOverride'],
      items: {
        'ui:title': '',
        targetLayer: {
          'ui:field': 'layerSelect',
        },
        opacity: {
          'ui:field': 'opacity',
        },
        sourceProperties: {
          'ui:field': (fieldProps: FieldProps) =>
            React.createElement(SourcePropertiesDebug, fieldProps),
        },
      },
      'ui:options': {
        orderable: false,
      },
      'ui:ArrayFieldTemplate': ArrayFieldTemplate,
    };

    // Remove properties that should not be displayed in the form
    const layerOverrideItems =
      schema.properties?.layerOverride?.items?.properties;
    if (layerOverrideItems) {
      delete layerOverrideItems.color;
      delete layerOverrideItems.symbologyState;
    }

    this.removeFormEntry('zoom', data, schema, uiSchema);
  }
}
