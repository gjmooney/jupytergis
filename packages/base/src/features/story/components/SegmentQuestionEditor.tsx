import React from 'react';

import { StoryEditorSession } from '@/src/features/story/storyEditorSession';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';

export interface ISegmentQuestionEditorProps {
  segmentId: string;
  prompt: string;
  answers: string[];
  featureLabel: string;
  onPromptChange: (prompt: string) => void;
  onAnswersChange: (answers: string[]) => void;
}

export function SegmentQuestionEditor({
  segmentId,
  prompt,
  answers,
  featureLabel,
  onPromptChange,
  onAnswersChange,
}: ISegmentQuestionEditorProps): JSX.Element {
  return (
    <div className="jgis-story-editor-stack">
      <label className="jgis-story-editor-field">
        <span>Prompt</span>
        <Input
          value={prompt}
          aria-label="Question prompt"
          onChange={event => {
            onPromptChange(event.target.value);
          }}
        />
      </label>
      <div className="jgis-story-editor-stack jgis-story-editor-stack--tight">
        <span className="jgis-story-editor-label">Accepted answers</span>
        <p className="jgis-story-editor-help">
          The first answer is the name shown after a miss. Later rows are
          aliases.
        </p>
        {answers.map((answer, index) => (
          <div key={index} className="jgis-story-editor-row">
            <Input
              value={answer}
              aria-label={index === 0 ? 'Accepted answer' : `Alias ${index}`}
              onChange={event => {
                const next = [...answers];
                next[index] = event.target.value;
                onAnswersChange(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onAnswersChange(answers.filter((_, item) => item !== index));
              }}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onAnswersChange([...answers, '']);
          }}
        >
          Add answer
        </Button>
      </div>
      <div className="jgis-story-editor-stack jgis-story-editor-stack--tight">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            StoryEditorSession.getInstance().enterPickFeatureMode(segmentId);
          }}
        >
          Pick on map
        </Button>
        {featureLabel ? (
          <p className="jgis-story-editor-help">{featureLabel}</p>
        ) : (
          <p className="jgis-story-editor-help">
            Select the country layer, then click the feature to identify.
          </p>
        )}
      </div>
    </div>
  );
}
