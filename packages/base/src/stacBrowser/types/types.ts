export interface IStacCollection {
  // Core fields
  type: 'Collection';
  stac_version: string;
  stac_extensions?: string[];
  id: string;
  title?: string;
  description: string;
  keywords?: string[];
  license: string;
  providers?: IStacProvider[];
  extent: IStacExtent;
  summaries?: {
    [key: string]: IStacRange | JSON;
  };
  links: IStacLink[];
  assets?: {
    [key: string]: IStacAsset;
  };
}

export interface IStacRange {
  minimum: number | string;
  maximum: number | string;
}

export interface IStacExtent {
  spatial: IStacSpacialExtent;
  temporal: IStacTemporalExtent;
}

export interface IStacTemporalExtent {
  interval: Array<[string | null, string | null]>; // Time intervals (start/end)
}

export interface IStacSpacialExtent {
  bbox: number[][]; // Array of bounding boxes ([west, south, east, north] or 3D)
}

export interface IStacProvider {
  name: string;
  description?: string;
  roles?: ['licensor' | 'producer' | 'processor' | 'host'];
  url?: string;
}

export interface IStacLink {
  rel: string; // Relationship type
  href: string;
  type?: string; // Media type
  title?: string;
}

export interface IStacAsset {
  href: string;
  title?: string;
  description?: string;
  type?: string; // Media type
  roles?: string[];
}

export interface IStacItem {
  type: 'Feature';
  stac_version: string;
  stac_extensions?: string[];
  id: string;
  geometry: {
    type: 'Polygon';
    coordinates: number[];
  } | null;
  // required if geometry is not null
  bbox: [number, number, number, number] | null;
  properties: {
    title: string;
    description: string;
    datetime: null | string;
    start_datetime: string;
    end_datetime: string;
    created: string;
    updated: string;
    platform: string;
    instruments: string[];
    constellation: string;
    mission: string;
    gsd: number;
    // Allow additional optional properties
    [key: string]: any;
  };
  links: IStacLink[];
  assets: Record<string, IStacAsset>;
  collection: string;
}

export interface IStacSearchResult {
  context: { returned: number; limit: number; matched: number };
  features: IStacItem[];
  links: IStacLink[];
  stac_extensions: string[];
  stac_version: string;
  type: 'FeatureCollection';
}

export interface IStacQueryBody {
  bbox: [number, number, number, number];
  limit?: number;
  page?: number;
  query: {
    dataset?: {
      in: string[];
    };
    end_datetime: {
      gte: string;
    };
    latest: {
      eq: true;
    };
    platform?: {
      in: string[];
    };
  };
  sortBy: [
    {
      direction: 'desc';
      field: 'start_datetime';
    },
  ];
}

// export type StacFilterKey =
//   | 'collections'
//   | 'datasets'
//   | 'platforms'
//   | 'products';

export type StacFilterOperator =
  | '='
  | '!='
  | '<'
  | '>'
  | '<='
  | '>='
  | 'in'
  | 'startsWith'
  | 'endsWith'
  | 'contains';

export type StacFilterOperatorText =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'in'
  | 'startsWith'
  | 'endsWith'
  | 'contains';

export const OPERATOR_SYMBOL_TO_TEXT: Record<
  StacFilterOperator,
  StacFilterOperatorText
> = {
  '=': 'eq',
  '!=': 'neq',
  '<': 'lt',
  '<=': 'lte',
  '>': 'gt',
  '>=': 'gte',
  in: 'in',
  startsWith: 'startsWith',
  endsWith: 'endsWith',
  contains: 'contains',
};

export interface ICustomFilter {
  property: string;
  operator: StacFilterOperatorText;
  value: string;
}

export type StacFilterState = {
  collections: Set<string>;
  datasets: Set<string>;
  platforms: Set<string>;
  products: Set<string>;
  custom: ICustomFilter[];
};

export type StacFilterStateStateDb = {
  [K in keyof StacFilterState]: K extends 'custom' ? ICustomFilter[] : string[];
};

export type StacFilterSetters = {
  [K in keyof StacFilterState]: (val: StacFilterState[K]) => void;
};
