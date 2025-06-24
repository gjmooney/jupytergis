import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/src/shared/components/Button';
import { Calendar } from '@/src/shared/components/Calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/shared/components/Popover';
import {
  StacFilterState,
  StacFilterSetters,
  StacFilterOperator,
} from '@/src/stacBrowser/types/types';
import CustomFilterSection from './CustomFilterSection';
import { SupportedStacApi } from '../components/StacApiSelector';

interface ICustomFiltersViewProps {
  filterState: StacFilterState;
  filterSetters: StacFilterSetters;
  startTime: Date | undefined;
  setStartTime: (date: Date | undefined) => void;
  endTime: Date | undefined;
  setEndTime: (date: Date | undefined) => void;
  handleAddCustomFilter: (
    property: string,
    operator: StacFilterOperator,
    value: string,
  ) => void;
  stacApi: SupportedStacApi;
  setStacApi: (api: SupportedStacApi) => void;
}

const CustomStacFilters = ({
  filterState,
  filterSetters,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  handleAddCustomFilter,
  stacApi,
  setStacApi,
}: ICustomFiltersViewProps) => {
  return (
    <div className="jgis-stac-browser-filters-panel">
      {stacApi.apiSource === 'Custom' && (
        <div style={{ marginBottom: '0.5rem' }}>
          <label htmlFor="custom-api-url" style={{ marginRight: '0.5rem' }}>
            API URL:
          </label>
          <input
            id="custom-api-url"
            type="text"
            value={stacApi.url}
            defaultValue={'https://openveda.cloud/api/stac/search'}
            onChange={e => setStacApi({ ...stacApi, url: e.target.value })}
            style={{ width: '60%' }}
          />
        </div>
      )}
      <div className="jgis-stac-browser-date-picker">
        <Popover>
          <PopoverTrigger asChild>
            <Button style={{ padding: '0 0.5rem' }} variant={'outline'}>
              <CalendarIcon className="jgis-stac-datepicker-icon" />
              {startTime ? format(startTime, 'PPP') : <span>Start Date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar
              mode="single"
              selected={startTime}
              onSelect={setStartTime}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button style={{ padding: '0 0.5rem' }} variant={'outline'}>
              <CalendarIcon className="jgis-stac-datepicker-icon" />
              {endTime ? format(endTime, 'PPP') : <span>End Date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar
              mode="single"
              selected={endTime}
              onSelect={setEndTime}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {/* TODO: Move the type check whatever here */}
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <span>Property</span>
        <span>Value</span>
      </div>

      {/* List of custom filters */}
      {filterState.custom.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <strong>Custom Filters:</strong>
          <ul style={{ paddingLeft: '1.2em' }}>
            {filterState.custom.map((f, idx) => (
              <li
                key={idx}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}
              >
                <span>
                  <code>{f.property}</code> <b>{f.operator}</b>{' '}
                  <code>{f.value}</code>
                </span>
                <button
                  aria-label="Remove filter"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'red',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1em',
                  }}
                  onClick={() => {
                    const updated = filterState.custom.slice();
                    updated.splice(idx, 1);
                    filterSetters.custom(updated);
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <CustomFilterSection handleAddCustomFilter={handleAddCustomFilter} />
      {/* <div>cloud cover</div> */}
    </div>
  );
};
export default CustomStacFilters;
