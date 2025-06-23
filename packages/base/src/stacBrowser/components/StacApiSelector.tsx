import { ChevronDown } from 'lucide-react';
import React, { useEffect } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/shared/components/DropdownMenu';

interface IStacApiSelectorProps {
  apiUrl: SupportedStacApi;
  setStacApiUrl: (url: SupportedStacApi) => void;
}

export type SupportedStacApi =
  | {
      apiSource: 'GEODES';
      url: 'https://geodes-portal.cnes.fr/api/stac/search';
    }
  | {
      apiSource: 'OpenVEDA';
      url: 'https://openveda.cloud/api/stac/search';
    }
  | {
      apiSource: 'Custom';
      url: string;
    };

const SUPPORTED_STAC_API_URLS: SupportedStacApi[] = [
  {
    apiSource: 'GEODES',
    url: 'https://geodes-portal.cnes.fr/api/stac/search',
  },
  //   { apiSource: 'OpenVEDA', url: 'https://openveda.cloud/api/stac/search' },
  {
    apiSource: 'Custom',
    url: '',
  },
];

const StacApiSelector = ({ apiUrl, setStacApiUrl }: IStacApiSelectorProps) => {
  useEffect(() => {
    console.log('apiUrl', apiUrl);
  }, [apiUrl]);

  return (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.25rem',
      }}
    >
      <span style={{ fontWeight: 'bold' }}>STAC API: </span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="jgis-stac-filter-trigger">
          {SUPPORTED_STAC_API_URLS.find(url => url.url === apiUrl.url)
            ?.apiSource ?? 'Custom'}
          <ChevronDown className="DropdownMenuIcon" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom">
          {SUPPORTED_STAC_API_URLS.map(url => (
            <DropdownMenuItem
              key={url.url}
              onClick={() => setStacApiUrl({ ...url })}
            >
              {url.apiSource} - {url.url}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default StacApiSelector;
