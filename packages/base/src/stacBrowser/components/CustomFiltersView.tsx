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
} from '@/src/stacBrowser/types/types';
import CustomFilterSection from './CustomFilterSection';

interface ICustomFiltersViewProps {
  filterState: StacFilterState;
  filterSetters: StacFilterSetters;
  startTime: Date | undefined;
  setStartTime: (date: Date | undefined) => void;
  endTime: Date | undefined;
  setEndTime: (date: Date | undefined) => void;
}

const CustomFiltersView = ({
  filterState,
  filterSetters,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
}: ICustomFiltersViewProps) => {
  return (
    <div className="jgis-stac-browser-filters-panel">
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
      <CustomFilterSection />
      {/* <div>cloud cover</div> */}
    </div>
  );
};
export default CustomFiltersView;
