import { featureMatchesQuestionRef } from '@/src/features/story/utils/questionHighlight';

describe('featureMatchesQuestionRef', () => {
  it('matches the stored property value', () => {
    expect(
      featureMatchesQuestionRef(
        { NAME: 'France', ISO_A3: 'FRA' },
        'NAME',
        'France',
      ),
    ).toBe(true);
  });

  it('ignores other properties and blank values', () => {
    expect(
      featureMatchesQuestionRef({ NAME: 'France' }, 'NAME', 'Germany'),
    ).toBe(false);
    expect(featureMatchesQuestionRef({ NAME: 'France' }, 'ISO_A3', 'FRA')).toBe(
      false,
    );
    expect(featureMatchesQuestionRef({}, 'NAME', 'France')).toBe(false);
  });
});
