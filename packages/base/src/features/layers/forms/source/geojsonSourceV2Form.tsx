import { IDict } from '@jupytergis/schema';
import React, { useCallback, useEffect, useState } from 'react';

import type { ISourceFormProps } from './sourceform';

type LocatorKind = 'path' | 'url' | 'data';

function buildParameters(
  kind: LocatorKind,
  path: string,
  url: string,
  attribution: string,
  name: string,
): IDict {
  const base: IDict = {};
  if (name.trim()) {
    base.name = name.trim();
  }
  if (attribution.trim()) {
    base.attribution = attribution.trim();
  }

  if (kind === 'path') {
    return { ...base, path: path.trim() };
  }
  if (kind === 'url') {
    return { ...base, url: url.trim() };
  }
  return {
    ...base,
    data: { type: 'FeatureCollection', features: [] },
  };
}

/**
 * MVP non-RJSF create/edit form for GeoJSONSourceV2 (data | path | url).
 */
export function GeoJSONSourceV2Form(
  props: ISourceFormProps,
): React.ReactElement {
  const {
    sourceData,
    syncData,
    dialogOptions,
    formErrorSignal,
    formChangedSignal,
  } = props;

  const initialKind: LocatorKind =
    sourceData && 'url' in sourceData && sourceData.url
      ? 'url'
      : sourceData && 'path' in sourceData && sourceData.path
        ? 'path'
        : sourceData && 'data' in sourceData
          ? 'data'
          : 'path';

  const [kind, setKind] = useState<LocatorKind>(initialKind);
  const [name, setName] = useState(String(sourceData?.name ?? ''));
  const [path, setPath] = useState(String(sourceData?.path ?? ''));
  const [url, setUrl] = useState(String(sourceData?.url ?? ''));
  const [attribution, setAttribution] = useState(
    String(sourceData?.attribution ?? ''),
  );

  const push = useCallback(
    (
      nextKind: LocatorKind,
      nextPath: string,
      nextUrl: string,
      nextAttribution: string,
      nextName: string,
    ) => {
      const properties = buildParameters(
        nextKind,
        nextPath,
        nextUrl,
        nextAttribution,
        nextName,
      );
      syncData(properties);
      if (dialogOptions) {
        dialogOptions.sourceData = { ...properties };
      }
      formChangedSignal?.emit(properties);

      const hasError =
        (nextKind === 'path' && !nextPath.trim()) ||
        (nextKind === 'url' && !nextUrl.trim());
      formErrorSignal?.emit(hasError);
    },
    [syncData, dialogOptions, formChangedSignal, formErrorSignal],
  );

  useEffect(() => {
    push(kind, path, url, attribution, name);
    // Initial sync only; later updates go through field handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="jgis-geojson-v2-form" style={{ display: 'grid', gap: 8 }}>
      <label>
        Name
        <input
          type="text"
          value={name}
          onChange={e => {
            const v = e.target.value;
            setName(v);
            push(kind, path, url, attribution, v);
          }}
          style={{ display: 'block', width: '100%' }}
        />
      </label>

      <fieldset style={{ border: '1px solid var(--jp-border-color2)', padding: 8 }}>
        <legend>Locator</legend>
        <label style={{ marginRight: 12 }}>
          <input
            type="radio"
            name="geojson-v2-kind"
            checked={kind === 'path'}
            onChange={() => {
              setKind('path');
              push('path', path, url, attribution, name);
            }}
          />{' '}
          Path
        </label>
        <label style={{ marginRight: 12 }}>
          <input
            type="radio"
            name="geojson-v2-kind"
            checked={kind === 'url'}
            onChange={() => {
              setKind('url');
              push('url', path, url, attribution, name);
            }}
          />{' '}
          URL
        </label>
        <label>
          <input
            type="radio"
            name="geojson-v2-kind"
            checked={kind === 'data'}
            onChange={() => {
              setKind('data');
              push('data', path, url, attribution, name);
            }}
          />{' '}
          Empty FeatureCollection
        </label>
      </fieldset>

      {kind === 'path' && (
        <label>
          Path
          <input
            type="text"
            value={path}
            placeholder="relative/path.geojson"
            onChange={e => {
              const v = e.target.value;
              setPath(v);
              push(kind, v, url, attribution, name);
            }}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
      )}

      {kind === 'url' && (
        <label>
          URL
          <input
            type="url"
            value={url}
            placeholder="https://example.com/data.geojson"
            onChange={e => {
              const v = e.target.value;
              setUrl(v);
              push(kind, path, v, attribution, name);
            }}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
      )}

      {kind === 'data' && (
        <p style={{ margin: 0, opacity: 0.8 }}>
          Creates an empty FeatureCollection (inline data).
        </p>
      )}

      <label>
        Attribution
        <input
          type="text"
          value={attribution}
          onChange={e => {
            const v = e.target.value;
            setAttribution(v);
            push(kind, path, url, v, name);
          }}
          style={{ display: 'block', width: '100%' }}
        />
      </label>
    </div>
  );
}
