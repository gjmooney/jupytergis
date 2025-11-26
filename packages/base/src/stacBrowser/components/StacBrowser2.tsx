import { IJupyterGISModel } from '@jupytergis/schema';
import React, { useEffect, useState } from 'react';

import { fetchWithProxies } from '@/src/tools';

interface IStacBrowser2Props {
  model?: IJupyterGISModel;
}

const API_URL = 'https://stac.dataspace.copernicus.eu/v1/';
// This is a generic UI for apis that support filter extension
function StacBrowser2({ model }: IStacBrowser2Props) {
  const [queryableProps, setQueryableProps] = useState<[string, any][]>();

  if (!model) {
    console.log('no model');
    return;
  }

  useEffect(() => {
    const fatch = async () => {
      const data = await fetchWithProxies(
        API_URL + 'queryables',
        model,
        async response => await response.json(),
        undefined,
        'internal',
      );

      console.log('data', data);
      setQueryableProps(Object.entries(data.properties));
    };

    const d = fatch();

    console.log('d', d);
  }, []);

  const getInputBasedOnType = (val: any): React.ReactNode => {
    switch (val.type) {
      case 'string':
        if (val.enum) {
          return (
            <select style={{ maxWidth: '75px' }}>
              {val.enum.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        }
        return <input type="text" style={{ maxWidth: '75px' }} />;
      case 'number':
        return (
          <input
            type="number"
            style={{ maxWidth: '75px' }}
            min={val.min !== undefined ? val.min : undefined}
            max={val.max !== undefined ? val.max : undefined}
          />
        );
      default:
        return <input type="" style={{ maxWidth: '75px' }} />;
    }
  };

  return (
    <div>
      {/* fake api choice */}
      <span>API: {API_URL}</span>
      {/* temporal extent  */}

      {/* spatial extent  */}
      {/* collections */}
      {/* items IDs */}
      {/* additional filters - this is where queryables should end up */}
      {queryableProps?.map(([property, val]) => (
        <div
          key={property}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <span style={{ display: 'flex', gap: '0.25rem' }}>
            <label id={`${property}-title`}>{val.title}</label>
            {getInputBasedOnType(val)}
          </span>
          <span>{val.description}</span>
        </div>
      ))}
      {/* sort */}
      {/* items per page */}
    </div>
  );
}

export default StacBrowser2;
