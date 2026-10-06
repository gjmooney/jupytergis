import type {
  IJupyterGISModel,
  IStorySegmentLayer,
} from '@jupytergis/schema';
import { Geometry as OLGeometry } from 'ol/geom';
import View from 'ol/View';

export const DEFAULT_QUESTION_PROMPT = 'Name this country';

const NAME_PROPERTY_KEYS = ['NAME', 'NAME_LONG', 'ADMIN', 'name'] as const;
const ISO_PROPERTY_KEYS = ['ISO_A3', 'ISO_A2', 'ADM0_A3'] as const;

type InteractiveQuestion = NonNullable<IStorySegmentLayer['interactive']>;
type InteractiveFeatureRef = NonNullable<
  InteractiveQuestion['features']
>[number];

export interface IFeaturePropertyMatch {
  property: string;
  value: string;
  answers: string[];
}

export function defaultInteractiveQuestion(): InteractiveQuestion {
  return {
    prompt: DEFAULT_QUESTION_PROMPT,
    acceptedAnswers: [],
    features: [],
  };
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function firstProperty(
  properties: Record<string, unknown>,
  keys: readonly string[],
): { property: string; value: string } | null {
  for (const key of keys) {
    const value = asText(properties[key]);
    if (value) {
      return { property: key, value };
    }
  }

  return null;
}

function firstStringProperty(
  properties: Record<string, unknown>,
): { property: string; value: string } | null {
  for (const [key, raw] of Object.entries(properties)) {
    if (key === 'geometry' || key === '_geometry' || key.startsWith('_')) {
      continue;
    }

    const value = asText(raw);
    if (value) {
      return { property: key, value };
    }
  }

  return null;
}

/**
 * Name and ISO values used to identify a clicked feature and prefill answers.
 * When no known name or ISO property exists, the feature reference still
 * points at the first string property and answers are left unchanged.
 */
export function matchFeatureProperties(
  properties: Record<string, unknown>,
): IFeaturePropertyMatch | null {
  const name = firstProperty(properties, NAME_PROPERTY_KEYS);
  const iso = firstProperty(properties, ISO_PROPERTY_KEYS);
  const fallback = name ?? iso ?? firstStringProperty(properties);

  if (!fallback) {
    return null;
  }

  const answers: string[] = [];
  if (name) {
    answers.push(name.value);
  }
  if (iso && iso.value.toLowerCase() !== name?.value.toLowerCase()) {
    answers.push(iso.value);
  }

  return {
    property: fallback.property,
    value: fallback.value,
    answers,
  };
}

export function mergeAcceptedAnswers(
  current: string[],
  previousValue: string | undefined,
  prefill: string[],
): string[] {
  const nextPrefill = prefill.map(answer => answer.trim()).filter(Boolean);
  if (nextPrefill.length === 0) {
    return current;
  }

  const kept = current.filter(answer => {
    const trimmed = answer.trim();
    if (!trimmed) {
      return false;
    }

    if (previousValue && trimmed === previousValue) {
      return false;
    }

    return !nextPrefill.some(
      next => next.toLowerCase() === trimmed.toLowerCase(),
    );
  });

  return [...nextPrefill, ...kept];
}

export function extentFromFeatureProperties(
  properties: Record<string, unknown>,
): number[] | null {
  const geometry = properties.geometry ?? properties._geometry;
  if (!(geometry instanceof OLGeometry)) {
    return null;
  }

  const extent = geometry.getExtent();
  if (
    !extent ||
    extent.length !== 4 ||
    extent.some(value => !Number.isFinite(value)) ||
    extent[0] >= extent[2] ||
    extent[1] >= extent[3]
  ) {
    return null;
  }

  return [...extent];
}

export function zoomForExtent(
  extent: number[],
  size: [number, number],
  projection: string,
): number | null {
  if (size[0] < 1 || size[1] < 1) {
    return null;
  }

  const view = new View({ projection });
  const resolution = view.getResolutionForExtent(extent, size);
  if (resolution === undefined) {
    return null;
  }

  return view.getZoomForResolution(resolution) ?? null;
}

function segmentLayer(
  model: IJupyterGISModel,
  segmentId: string,
): { layer: NonNullable<ReturnType<IJupyterGISModel['getLayer']>> } | null {
  const layer = model.getLayer(segmentId);
  if (!layer || layer.type !== 'StorySegmentLayer') {
    return null;
  }

  return { layer };
}

export function updateInteractiveQuestion(
  model: IJupyterGISModel,
  segmentId: string,
  patch: Partial<Pick<InteractiveQuestion, 'prompt' | 'acceptedAnswers'>>,
): boolean {
  const found = segmentLayer(model, segmentId);
  if (!found) {
    return false;
  }

  const parameters = found.layer.parameters as IStorySegmentLayer;
  const interactive = parameters.interactive ?? defaultInteractiveQuestion();

  model.sharedModel.updateObjectParameters(segmentId, {
    interactive: {
      ...interactive,
      ...patch,
    },
  });

  return true;
}

export function applyPickedFeature(
  model: IJupyterGISModel,
  segmentId: string,
  mapSize: [number, number] | null,
): boolean {
  const identified = model.localState?.identifiedFeatures?.value ?? [];
  const feature = identified[0]?.feature;
  const selected = model.localState?.selected?.value;
  const layerId = selected ? Object.keys(selected)[0] : undefined;

  if (!feature || !layerId) {
    return false;
  }

  const found = segmentLayer(model, segmentId);
  if (!found) {
    return false;
  }

  const properties = feature as Record<string, unknown>;
  const match = matchFeatureProperties(properties);
  if (!match) {
    return false;
  }

  const parameters = {
    ...(found.layer.parameters as IStorySegmentLayer),
  };
  const previous = parameters.interactive ?? defaultInteractiveQuestion();
  const previousValue = previous.features?.[0]?.value;
  const featureRef: InteractiveFeatureRef = {
    layerId,
    property: match.property,
    value: match.value,
  };
  const extent = extentFromFeatureProperties(properties);
  const projection = model.getOptions().projection ?? 'EPSG:3857';
  const zoom =
    extent && mapSize
      ? zoomForExtent(extent, mapSize, projection)
      : null;

  parameters.interactive = {
    prompt: previous.prompt?.trim() || DEFAULT_QUESTION_PROMPT,
    acceptedAnswers: mergeAcceptedAnswers(
      previous.acceptedAnswers ?? [],
      previousValue,
      match.answers,
    ),
    features: [featureRef],
  };

  if (extent) {
    parameters.extent = extent;
  }
  if (zoom !== null) {
    parameters.zoom = zoom;
  }

  model.sharedModel.updateLayer(segmentId, {
    ...found.layer,
    parameters,
  });

  return true;
}
