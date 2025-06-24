import { IJupyterGISModel } from '@jupytergis/schema';
import React, { useEffect } from 'react';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/src/shared/components/Tabs';
import useStacSearch from '@/src/stacBrowser/hooks/useStacSearch';
import CustomStacFilters from './CustomStacFilters';
import StacApiSelector from './StacApiSelector';
import StacPanelFilters from './StacPanelFilters';
import StacPanelResults from './StacPanelResults';

interface IStacViewProps {
  model?: IJupyterGISModel;
}
const StacPanelView = ({ model }: IStacViewProps) => {
  const {
    filterState,
    filterSetters,
    results,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    totalPages,
    currentPage,
    totalResults,
    handlePaginationClick,
    handleResultClick,
    formatResult,
    isLoading,
    stacApi,
    setStacApi,
    handleAddCustomFilter,
  } = useStacSearch({ model });

  useEffect(() => {
    console.log('apiUrl', stacApi);
  }, [stacApi]);

  if (!model) {
    return null;
  }

  return (
    <>
      <StacApiSelector apiUrl={stacApi} setStacApiUrl={setStacApi} />
      <Tabs defaultValue="filters" className="jgis-stac-browser-main">
        <TabsList style={{ borderRadius: 0 }}>
          <TabsTrigger className="jGIS-layer-browser-category" value="filters">
            Filters
          </TabsTrigger>
          <TabsTrigger
            className="jGIS-layer-browser-category"
            value="results"
          >{`Results (${totalResults})`}</TabsTrigger>
        </TabsList>
        {/* TODO: dont do a ternary */}
        <TabsContent value="filters">
          {stacApi.apiSource === 'GEODES' ? (
            <StacPanelFilters
              filterState={filterState}
              filterSetters={filterSetters}
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
            />
          ) : stacApi.apiSource === 'Custom' ? (
            <CustomStacFilters
              filterState={filterState}
              filterSetters={filterSetters}
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
              handleAddCustomFilter={handleAddCustomFilter}
              stacApi={stacApi}
              setStacApi={setStacApi}
            />
          ) : (
            <div>Shouldnt be here</div>
          )}
        </TabsContent>
        <TabsContent value="results">
          <StacPanelResults
            results={results}
            currentPage={currentPage}
            totalPages={totalPages}
            handlePaginationClick={handlePaginationClick}
            handleResultClick={handleResultClick}
            formatResult={formatResult}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default StacPanelView;
