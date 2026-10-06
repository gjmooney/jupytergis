import { STORY_TYPE } from '@/src/types';

import { getStoryPresentationMode } from './getStoryPresentationMode';

describe('getStoryPresentationMode', () => {
  it('uses the column stepper for guided and interactive stories', () => {
    expect(getStoryPresentationMode(STORY_TYPE.guided)).toBe('column');
    expect(getStoryPresentationMode(STORY_TYPE.interactive)).toBe('column');
  });

  it('uses vertical scroll for vertical scroll stories', () => {
    expect(getStoryPresentationMode(STORY_TYPE.verticalScroll)).toBe(
      'verticalScroll',
    );
  });
});
