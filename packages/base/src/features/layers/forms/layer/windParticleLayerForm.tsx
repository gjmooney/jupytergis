import { IDict } from '@jupytergis/schema';
import { UiSchema } from '@rjsf/utils';
import React, { useMemo } from 'react';

import { SchemaForm } from '@/src/shared/formbuilder/objectform/SchemaForm';
import {
  processBaseSchema,
  removeFormEntry,
  removeNestedFormEntry,
} from '@/src/shared/formbuilder/objectform/schemaUtils';
import { useSchemaFormState } from '@/src/shared/formbuilder/objectform/useSchemaFormState';
import { deepCopy } from '@/src/tools';
import type { ILayerProps } from './layerform';

/**
 * Wind layer properties: animation options only.
 * Color ramp / velocity range are edited via Edit Symbology.
 */
export function WindParticleLayerPropertiesForm(
  props: ILayerProps,
): React.ReactElement | null {
  const {
    schema: schemaProp,
    sourceData,
    syncData,
    model,
    filePath,
    formContext,
    dialogOptions,
    formErrorSignal,
  } = props;

  const {
    formData,
    schema,
    formContextValue,
    hasSchema,
    handleChangeBase,
    handleSubmitBase,
  } = useSchemaFormState({
    sourceData,
    schemaProp,
    model,
    syncData,
    cancel: props.cancel,
    onAfterChange: dialogOptions
      ? (data: IDict) => {
          dialogOptions.layerData = { ...data };
        }
      : undefined,
  });

  const uiSchema = useMemo(() => {
    const builtUiSchema: UiSchema = {};
    const dataCopy = deepCopy(formData);

    for (const key of [
      'colorRamp',
      'nClasses',
      'reverse',
      'colorScale',
      'minVelocity',
      'maxVelocity',
    ]) {
      removeNestedFormEntry('windOptions', key, formData, schema, builtUiSchema);
    }

    processBaseSchema(
      dataCopy,
      schema,
      builtUiSchema,
      formContext,
      removeFormEntry,
    );

    if (formContext === 'update') {
      removeFormEntry('source', formData, schema, builtUiSchema);
    }

    return builtUiSchema;
  }, [schema, formData, formContext]);

  if (!hasSchema) {
    return null;
  }

  return (
    <SchemaForm
      schema={schema}
      formData={formData}
      onChange={handleChangeBase}
      onSubmit={handleSubmitBase}
      formContext={formContextValue}
      filePath={filePath}
      uiSchema={uiSchema}
      formErrorSignal={formErrorSignal}
    />
  );
}
