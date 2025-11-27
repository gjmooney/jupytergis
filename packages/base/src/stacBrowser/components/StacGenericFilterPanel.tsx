import { IJGISLayer, IJupyterGISModel } from '@jupytergis/schema';
import { UUID } from '@lumino/coreutils';
import React, { useEffect, useState } from 'react';

import { fetchWithProxies } from '@/src/tools';
import StacCheckboxWithLabel from './shared/StacCheckboxWithLabel';
import StacQueryableFilterList from './shared/StacQueryableFilterList';
import StacSearchDatePicker from './shared/StacSearchDatePicker';
import useStacSearch from '../hooks/useStacSearch';

interface IStacBrowser2Props {
  model?: IJupyterGISModel;
}

type FilteredCollection = {
  title?: string;
  id: string;
};

const API_URL = 'https://stac.dataspace.copernicus.eu/v1/';
// This is a generic UI for apis that support filter extension
function StacGenericFilterPanel({ model }: IStacBrowser2Props) {
  const [queryableProps, setQueryableProps] = useState<[string, any][]>();
  const [collections, setCollections] = useState<FilteredCollection[]>([]);

  const {
    startTime,
    endTime,
    setStartTime,
    setEndTime,
    useWorldBBox,
    setUseWorldBBox,
  } = useStacSearch({
    model,
  });

  if (!model) {
    console.log('no model');
    return;
  }

  // for collections
  useEffect(() => {
    const fatch = async () => {
      const data = await fetchWithProxies(
        API_URL + 'collections',
        model,
        async response => await response.json(),
        undefined,
        'internal',
      );

      const collections: FilteredCollection[] = data.collections.filter(
        (collection: any) => ({
          title: collection.title ?? collection.id,
          id: collection.id,
        }),
      );

      console.log('collections', collections);
      setCollections(collections);
    };

    fatch();
  }, []);

  // for queryables
  // should listen for colletion changes and requery
  // need a way to handle querying multiple collections without refetching everything
  // collection id -> queryables map as a basic cache thing??
  useEffect(() => {
    const fatch = async () => {
      const data = await fetchWithProxies(
        API_URL + 'queryables',
        model,
        async response => await response.json(),
        undefined,
        'internal',
      );

      setQueryableProps(Object.entries(data.properties));
    };

    fatch();
  }, []);

  const handleSubmit = async () => {
    const XSRF_TOKEN = document.cookie.match(/_xsrf=([^;]+)/)?.[1];

    const body = {
      collections: ['sentinel-2-l2a'],
      datetime: '2025-11-01T00:00:00.000Z/2025-11-08T00:00:00.000Z',
      filter: {
        args: [
          {
            args: [
              {
                property: 'eo:cloud_cover',
              },
              80,
            ],
            op: '<=',
          },
        ],
        op: 'and',
      },
      'filter-lang': 'cql2-json',
      limit: 12,
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRFToken': XSRF_TOKEN,
        credentials: 'include',
      },
      body: JSON.stringify(body),
    };

    const data: any = await fetchWithProxies(
      'https://stac.dataspace.copernicus.eu/v1/search',
      model,
      async response => await response.json(),
      //@ts-expect-error Jupyter requires X-XSRFToken header
      options,
      'internal',
    );

    const sample = data.features[0].assets;

    const filteredAssets = Object.entries(sample).filter(
      ([key, asset]: [string, any]) => {
        const roles = asset.role || [];
        return roles.includes('thumbnail') || roles.includes('overview');
      },
    );

    console.log('filteredAssets', filteredAssets);
    addToMap(data.features[0]);
  };

  const addToMap = (stacData: any) => {
    const layerId = UUID.uuid4();
    // const stacData = results.find(item => item.id === id);

    if (!stacData) {
      console.error('Result not found:');
      return;
    }

    const layerModel: IJGISLayer = {
      type: 'StacLayer',
      parameters: { data: stacData },
      visible: true,
      name: stacData.properties.title ?? stacData.id,
    };

    model && model.addLayer(layerId, layerModel);
  };

  return (
    <div>
      {/* fake api choice */}
      <span>API: {API_URL}</span>
      {/* temporal extent  */}
      <StacSearchDatePicker
        startTime={startTime}
        endTime={endTime}
        setStartTime={setStartTime}
        setEndTime={setEndTime}
      />

      {/* spatial extent  */}
      <StacCheckboxWithLabel
        checked={useWorldBBox}
        onCheckedChange={setUseWorldBBox}
        label="Use entire world"
      />
      {/* collections */}
      <select style={{ maxWidth: '75px' }}>
        {collections.map((option: FilteredCollection) => (
          <option key={option.id} value={option.id}>
            {option.title}
          </option>
        ))}
      </select>
      {/* items IDs */}
      {/* additional filters - this is where queryables should end up */}
      {queryableProps && (
        <StacQueryableFilterList queryableProps={queryableProps} />
      )}
      {/* sort */}
      {/* items per page */}
      <button onClick={handleSubmit}>submit</button>
    </div>
  );
}

export default StacGenericFilterPanel;
