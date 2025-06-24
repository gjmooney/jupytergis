import { IJGISLayer, IJupyterGISModel } from '@jupytergis/schema';
import { UUID, ReadonlyPartialJSONValue } from '@lumino/coreutils';
import { startOfYesterday } from 'date-fns';
import { useEffect, useState } from 'react';

import useIsFirstRender from '@/src/shared/hooks/useIsFirstRender';
import { products } from '@/src/stacBrowser/constants';
import {
  IStacItem,
  IStacQueryBody,
  IStacSearchResult,
  StacFilterState,
  StacFilterSetters,
  ICustomFilter,
  StacFilterOperator,
  OPERATOR_SYMBOL_TO_TEXT,
} from '@/src/stacBrowser/types/types';
import { GlobalStateDbManager } from '@/src/store';
import { fetchWithProxies } from '@/src/tools';
import { SupportedStacApi } from '../components/StacApiSelector';

interface IUseStacSearchProps {
  model: IJupyterGISModel | undefined;
}

interface IUseStacSearchReturn {
  filterState: StacFilterState;
  filterSetters: StacFilterSetters;
  results: IStacItem[];
  startTime: Date | undefined;
  setStartTime: (date: Date | undefined) => void;
  endTime: Date | undefined;
  setEndTime: (date: Date | undefined) => void;
  totalPages: number;
  currentPage: number;
  totalResults: number;
  handlePaginationClick: (page: number) => Promise<void>;
  handleResultClick: (id: string) => Promise<void>;
  formatResult: (item: IStacItem) => string;
  isLoading: boolean;
  stacApi: SupportedStacApi;
  setStacApi: (api: SupportedStacApi) => void;
  handleAddCustomFilter: (
    property: string,
    operator: StacFilterOperator,
    value: string,
  ) => void;
}

// const API_URL = 'https://geodes-portal.cnes.fr/api/stac/search';
const DEFAULT_API: SupportedStacApi = {
  apiSource: 'GEODES',
  url: 'https://geodes-portal.cnes.fr/api/stac/search',
};
const XSRF_TOKEN = document.cookie.match(/_xsrf=([^;]+)/)?.[1];
const STAC_FILTERS_KEY = 'jupytergis:stac-filters';

/**
 * Custom hook for managing STAC search functionality
 * @param props - Configuration object containing datasets, platforms, products, and model
 * @returns Object containing state and handlers for STAC search
 */
function useStacSearch({ model }: IUseStacSearchProps): IUseStacSearchReturn {
  const isFirstRender = useIsFirstRender();
  const stateDb = GlobalStateDbManager.getInstance().getStateDb();

  const [results, setResults] = useState<IStacItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);
  const [stacApi, setStacApi] = useState<SupportedStacApi>(DEFAULT_API);
  const [currentBBox, setCurrentBBox] = useState<
    [number, number, number, number]
  >([-180, -90, 180, 90]);
  const [filterState, setFilterState] = useState<StacFilterState>({
    collections: new Set(),
    datasets: new Set(),
    platforms: new Set(),
    products: new Set(),
    custom: [],
  });

  const filterSetters: StacFilterSetters = {
    collections: val =>
      setFilterState(s => ({ ...s, collections: new Set(val as Set<string>) })),
    datasets: val =>
      setFilterState(s => ({ ...s, datasets: new Set(val as Set<string>) })),
    platforms: val =>
      setFilterState(s => ({ ...s, platforms: new Set(val as Set<string>) })),
    products: val =>
      setFilterState(s => ({ ...s, products: new Set(val as Set<string>) })),
    custom: val =>
      setFilterState(s => ({ ...s, custom: val as ICustomFilter[] })),
  };

  // On mount, fetch filterState and times from StateDB (if present)
  useEffect(() => {
    async function loadStacStateFromDb() {
      const savedFilterStateRaw = await stateDb?.fetch(STAC_FILTERS_KEY);
      const savedFilterState =
        savedFilterStateRaw &&
        typeof savedFilterStateRaw === 'object' &&
        !Array.isArray(savedFilterStateRaw)
          ? (savedFilterStateRaw as Record<string, unknown>)
          : {};

      setFilterState({
        collections: new Set((savedFilterState.collections as string[]) ?? []),
        datasets: new Set((savedFilterState.datasets as string[]) ?? []),
        platforms: new Set((savedFilterState.platforms as string[]) ?? []),
        products: new Set((savedFilterState.products as string[]) ?? []),
        custom: (savedFilterState.custom as ICustomFilter[]) ?? [],
      });
    }

    loadStacStateFromDb();
  }, [stateDb]);

  useEffect(() => {
    const getApiUrlFromSettings = async () => {
      let settings;
      if (model) {
        try {
          settings = model.getSettings();
        } catch (e) {
          console.warn('Failed to get settings from model. Falling back.', e);
        }
      }

      const apiUrl = settings?.stacApiUrl ?? DEFAULT_API;
      // setStacApiUrl(apiUrl);
    };

    getApiUrlFromSettings();
  }, [model]);

  // Save filterState to StateDB on change
  useEffect(() => {
    async function saveStacFilterStateToDb() {
      await stateDb?.save(STAC_FILTERS_KEY, {
        collections: Array.from(filterState.collections),
        datasets: Array.from(filterState.datasets),
        platforms: Array.from(filterState.platforms),
        products: Array.from(filterState.products),
        custom: filterState.custom,
      } as unknown as ReadonlyPartialJSONValue);
    }

    saveStacFilterStateToDb();
  }, [filterState, stateDb]);

  // Handle search when filters change
  useEffect(() => {
    if (!isFirstRender) {
      setCurrentPage(1);
      fetchResults(1);
    }
  }, [filterState, startTime, endTime]);

  // Listen for model updates to get current bounding box
  useEffect(() => {
    const listenToModel = (
      sender: IJupyterGISModel,
      bBoxIn4326: [number, number, number, number],
    ) => {
      setCurrentBBox(bBoxIn4326);
    };

    model?.updateResolutionSignal.connect(listenToModel);

    return () => {
      model?.updateResolutionSignal.disconnect(listenToModel);
    };
  }, [model]);

  const fetchResults = async (page = 1) => {
    const processingLevel = new Set<string>();
    const productType = new Set<string>();

    filterState.products.forEach(productCode => {
      products
        .filter(product => product.productCode === productCode)
        .forEach(product => {
          if (product.processingLevel) {
            processingLevel.add(product.processingLevel);
          }
          if (product.productType) {
            product.productType.forEach(type => productType.add(type));
          }
        });
    });

    const body: IStacQueryBody = {
      bbox: currentBBox,
      limit: 12,
      page,
      query: {
        latest: { eq: true },
        ...(filterState.datasets.size > 0 && {
          dataset: { in: Array.from(filterState.datasets) },
        }),
        end_datetime: {
          gte: startTime
            ? startTime.toISOString()
            : startOfYesterday().toISOString(),
        },
        ...(endTime && {
          start_datetime: { lte: endTime.toISOString() },
        }),
        ...(filterState.platforms.size > 0 && {
          platform: { in: Array.from(filterState.platforms) },
        }),
        ...(processingLevel.size > 0 && {
          'processing:level': { in: Array.from(processingLevel) },
        }),
        ...(productType.size > 0 && {
          'product:type': { in: Array.from(productType) },
        }),
        ...Object.fromEntries(
          filterState.custom
            .filter(f => f.property && f.operator && f.value)
            .map(f => {
              let parsedValue: any = f.value;
              if (!isNaN(Number(f.value))) {
                parsedValue = Number(f.value);
              }
              return [f.property, { [f.operator]: parsedValue }];
            }),
        ),
      },
      sortBy: [{ direction: 'desc', field: 'start_datetime' }],
    };

    try {
      setIsLoading(true);
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRFToken': XSRF_TOKEN,
          credentials: 'include',
        },
        body: JSON.stringify(body),
      };

      if (!model) {
        return;
      }

      const data = (await fetchWithProxies(
        stacApi.url,
        model,
        async response => await response.json(),
        //@ts-expect-error Jupyter requires X-XSRFToken header
        options,
      )) as IStacSearchResult;

      if (!data) {
        console.log('No Results found');
        setResults([]);
        setTotalPages(1);
        setTotalResults(0);
        return;
      }

      setResults(data.features);
      const pages = data.context.matched / data.context.limit;
      setTotalPages(Math.ceil(pages));
      setTotalResults(data.context.matched);
    } catch (error) {
      console.error('Error fetching data:', error);
      setResults([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles clicking on a result item
   * @param id - ID of the clicked result
   */
  const handleResultClick = async (id: string): Promise<void> => {
    if (!results) {
      return;
    }

    const layerId = UUID.uuid4();
    const stacData = results.find(item => item.id === id);

    if (!stacData) {
      console.error('Result not found:', id);
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

  /**
   * Handles pagination clicks
   * @param page - Page number to navigate to
   */
  const handlePaginationClick = async (page: number): Promise<void> => {
    setCurrentPage(page);
    model && fetchResults(page);
  };

  /**
   * Formats a result item for display
   * @param item - STAC item to format
   * @returns Formatted string representation of the item
   */
  const formatResult = (item: IStacItem): string => {
    return item.properties.title ?? item.id;
  };

  // Add this function to handle adding a custom filter
  const handleAddCustomFilter = (
    property: string,
    operator: StacFilterOperator,
    value: string,
  ) => {
    stateDb?.remove(STAC_FILTERS_KEY);

    const textOperator = OPERATOR_SYMBOL_TO_TEXT[operator];
    setFilterState(prev => ({
      ...prev,
      custom: [...prev.custom, { property, operator: textOperator, value }],
    }));
  };

  return {
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
    stacApi: stacApi,
    setStacApi: setStacApi,
    handleAddCustomFilter,
  };
}

export default useStacSearch;
