import {
  IDict,
  IJGISFormSchemaRegistry,
  IStorySegmentLayer,
} from '@jupytergis/schema';
import { FieldProps } from '@rjsf/core';
import * as React from 'react';

import { getSourceTypeForm } from '../../formselectors';
import type { ISourceFormProps } from '../source/sourceform';
import { deepCopy } from '@/src/tools';

function extractLayerOverrideIndex(idSchema: {
  $id?: string;
}): number | undefined {
  const id = idSchema?.$id ?? '';
  const match = id.match(/layerOverride_(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * RJSF custom field for layerOverride[].sourceProperties: renders the
 * appropriate source form for the target layer's source type.
 */
export function SourcePropertiesField(props: FieldProps): React.ReactElement {
  const context = props.formContext as
    | {
        formData?: IStorySegmentLayer;
        formSchemaRegistry?: IJGISFormSchemaRegistry;
      }
    | undefined;
  const fullFormData = context?.formData;
  const formSchemaRegistry = context?.formSchemaRegistry;
  const index = extractLayerOverrideIndex(props.idSchema ?? {});
  const sourceProperties =
    index !== undefined && fullFormData?.layerOverride?.[index]
      ? fullFormData.layerOverride[index].sourceProperties
      : undefined;
  const model = props.formContext?.model;
  const layerId = fullFormData?.layerOverride?.[index ?? 0]?.targetLayer;
  const layer = model?.getLayer(layerId);
  const sourceID = layer?.parameters?.source;
  const source = model?.getSource(sourceID);

  const sourceSchema =
    source?.type && formSchemaRegistry
      ? deepCopy(formSchemaRegistry.getSchemas().get(source.type))
      : undefined;

  console.log('sourceSchema', sourceSchema);
  const SourceForm = getSourceTypeForm(source?.type ?? 'GeoJSONSource');

  // this is sending the segment not the source
  // or its not sending anything and doing some default shit
  const formProps: ISourceFormProps = {
    model: model!,
    formContext: 'update',
    sourceData: sourceProperties,
    sourceType: source?.type ?? 'GeoJSONSource',
    schema: { sourceSchema },
    syncData: (properties: IDict) => props.onChange(properties),
    ...(sourceSchema && { schema: sourceSchema }),
  };
  return <SourceForm {...formProps} />;
}
