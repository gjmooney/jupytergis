import type { IJupyterGISModel } from '@jupytergis/schema';
import { Polygon } from 'ol/geom';

import {
  applyPickedFeature,
  gradeAnswer,
  matchFeatureProperties,
  mergeAcceptedAnswers,
} from '@/src/features/story/utils/interactiveQuestion';
import { updateSegmentContentMode } from '@/src/features/story/utils/storySegmentContent';

describe('gradeAnswer', () => {
  const accepted = ['France', 'République française', 'FRA'];

  it('matches case, accents, and surrounding space', () => {
    expect(gradeAnswer('  FRANCE ', accepted)).toBe(true);
    expect(gradeAnswer('republique francaise', accepted)).toBe(true);
    expect(gradeAnswer('fra', accepted)).toBe(true);
  });

  it('rejects a miss and an empty guess', () => {
    expect(gradeAnswer('Germany', accepted)).toBe(false);
    expect(gradeAnswer('   ', accepted)).toBe(false);
    expect(gradeAnswer('', [])).toBe(false);
    expect(gradeAnswer('', [''])).toBe(false);
  });
});

describe('matchFeatureProperties', () => {
  it('uses the name as the feature reference and the ISO code as an alias', () => {
    expect(
      matchFeatureProperties({
        NAME: 'France',
        ISO_A3: 'FRA',
        extra: 'ignored',
      }),
    ).toEqual({
      property: 'NAME',
      value: 'France',
      answers: ['France', 'FRA'],
    });
  });

  it('falls back to the first string property without prefilling answers', () => {
    expect(matchFeatureProperties({ population: '67000000' })).toEqual({
      property: 'population',
      value: '67000000',
      answers: [],
    });
  });
});

describe('mergeAcceptedAnswers', () => {
  it('replaces the previous feature value and keeps hand-typed answers', () => {
    expect(
      mergeAcceptedAnswers(
        ['France', 'FRA', 'République française'],
        'France',
        ['Germany', 'DEU'],
      ),
    ).toEqual(['Germany', 'DEU', 'FRA', 'République française']);
  });

  it('leaves the list unchanged when there is nothing to prefill', () => {
    expect(mergeAcceptedAnswers(['typed'], 'old', [])).toEqual(['typed']);
  });
});

function createSegmentModel(
  parameters: Record<string, unknown>,
): {
  model: IJupyterGISModel;
  updateLayer: jest.Mock;
} {
  const updateLayer = jest.fn();
  const model = {
    getLayer: () => ({
      type: 'StorySegmentLayer',
      parameters,
    }),
    sharedModel: {
      updateLayer,
      updateObjectParameters: jest.fn(),
    },
    getOptions: () => ({ projection: 'EPSG:3857' }),
    localState: {
      identifiedFeatures: { value: [] },
      selected: { value: {} },
    },
  } as unknown as IJupyterGISModel;

  return { model, updateLayer };
}

describe('updateSegmentContentMode', () => {
  it('adds a default question without turning every map segment into one', () => {
    const { model, updateLayer } = createSegmentModel({
      content: { contentMode: 'markdown', markdown: 'Note' },
    });

    expect(updateSegmentContentMode(model, 'seg', 'question')).toBe(true);
    expect(updateLayer).toHaveBeenCalledWith(
      'seg',
      expect.objectContaining({
        parameters: expect.objectContaining({
          interactive: {
            prompt: 'Name this country',
            acceptedAnswers: [],
            features: [],
          },
        }),
      }),
    );
  });

  it('keeps a map segment free of a question', () => {
    const { model, updateLayer } = createSegmentModel({
      content: { contentMode: 'map' },
      interactive: {
        prompt: 'Name this country',
        acceptedAnswers: ['France'],
        features: [],
      },
    });

    updateSegmentContentMode(model, 'seg', 'map');

    const parameters = updateLayer.mock.calls[0][1].parameters;
    expect(parameters.interactive).toBeUndefined();
    expect(parameters.content.contentMode).toBe('map');
  });

  it('removes the question when switching to text', () => {
    const { model, updateLayer } = createSegmentModel({
      content: { contentMode: 'map' },
      interactive: {
        prompt: 'Name this country',
        acceptedAnswers: ['France'],
        features: [],
      },
    });

    updateSegmentContentMode(model, 'seg', 'markdown');

    const parameters = updateLayer.mock.calls[0][1].parameters;
    expect(parameters.interactive).toBeUndefined();
    expect(parameters.content.contentMode).toBe('markdown');
  });
});

describe('applyPickedFeature', () => {
  it('writes the feature, answers, extent, and zoom', () => {
    const geometry = new Polygon([
      [
        [0, 0],
        [100000, 0],
        [100000, 100000],
        [0, 0],
      ],
    ]);
    const { model, updateLayer } = createSegmentModel({
      content: { contentMode: 'map' },
      interactive: {
        prompt: 'Name this country',
        acceptedAnswers: ['France', 'hand typed'],
        features: [{ layerId: 'old', property: 'NAME', value: 'France' }],
      },
    });
    model.localState!.identifiedFeatures!.value = [
      { feature: { NAME: 'Germany', ISO_A3: 'DEU', geometry } },
    ];
    model.localState!.selected!.value = { countries: {} };

    expect(applyPickedFeature(model, 'seg', [800, 600])).toBe(true);

    const parameters = updateLayer.mock.calls[0][1].parameters;
    expect(parameters.interactive).toEqual({
      prompt: 'Name this country',
      acceptedAnswers: ['Germany', 'DEU', 'hand typed'],
      features: [
        { layerId: 'countries', property: 'NAME', value: 'Germany' },
      ],
    });
    expect(parameters.extent).toEqual(geometry.getExtent());
    expect(parameters.zoom).toEqual(expect.any(Number));
  });

  it('keeps the bar when no feature has been identified', () => {
    const { model, updateLayer } = createSegmentModel({
      content: { contentMode: 'map' },
    });

    expect(applyPickedFeature(model, 'seg', [800, 600])).toBe(false);
    expect(updateLayer).not.toHaveBeenCalled();
  });
});
