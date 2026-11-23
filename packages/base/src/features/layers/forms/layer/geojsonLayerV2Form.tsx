import { IDict } from '@jupytergis/schema';
import React, { useCallback, useEffect, useState } from 'react';

import type { ILayerProps } from './layerform';

/**
 * MVP non-RJSF layer form for GeoJsonLayerV2 — name + source id only.
 * Symbology is edited elsewhere.
 */
export function GeoJsonLayerV2Form(
  props: ILayerProps,
): React.ReactElement {
  const { sourceData, syncData, dialogOptions, formErrorSignal } = props;

  const [name, setName] = useState(String(sourceData?.name ?? ''));
  const sourceId = String(sourceData?.source ?? '');

  const push = useCallback(
    (nextName: string) => {
      const properties: IDict = {
        name: nextName.trim() || 'Custom GeoJSON Layer (v2)',
        source: sourceId,
      };
      syncData(properties);
      if (dialogOptions) {
        dialogOptions.layerData = { ...properties };
      }
      formErrorSignal?.emit(false);
    },
    [syncData, dialogOptions, formErrorSignal, sourceId],
  );

  useEffect(() => {
    push(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="jgis-geojson-layer-v2-form" style={{ display: 'grid', gap: 8 }}>
      <label>
        Name
        <input
          type="text"
          value={name}
          onChange={e => {
            const v = e.target.value;
            setName(v);
            push(v);
          }}
          style={{ display: 'block', width: '100%' }}
        />
      </label>
    </div>
  );
}
