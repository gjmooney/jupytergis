import {
  faBookOpen,
  faCircleQuestion,
  faMap,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

import type { StorySegmentDisplayMode } from '@/src/features/story/types/types';
import { Button } from '@/src/shared/components/Button';

export interface ISegmentModePickerProps {
  value: StorySegmentDisplayMode;
  onChange: (mode: StorySegmentDisplayMode) => void;
  showQuestion?: boolean;
}

export function SegmentModePicker({
  value,
  onChange,
  showQuestion = false,
}: ISegmentModePickerProps): JSX.Element {
  const pickerClassName = showQuestion
    ? 'jgis-story-editor-segment-mode-picker jgis-story-editor-segment-mode-picker--interactive'
    : 'jgis-story-editor-segment-mode-picker';

  return (
    <section className="jgis-story-editor-block">
      <div className="jgis-story-editor-label">What is this segment?</div>
      <div className={pickerClassName}>
        {showQuestion ? (
          <ModeCard
            icon={faCircleQuestion}
            title="Question"
            description="Highlighted feature and a typed answer"
            selected={value === 'question'}
            onClick={() => onChange('question')}
          />
        ) : null}
        <ModeCard
          icon={faMap}
          title="Map"
          description="Saved map view with optional title and caption"
          selected={value === 'map'}
          onClick={() => onChange('map')}
        />
        <ModeCard
          icon={faBookOpen}
          title="Text"
          description="Full-screen markdown chapter"
          selected={value === 'markdown'}
          onClick={() => onChange('markdown')}
        />
      </div>
    </section>
  );
}

function ModeCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: typeof faMap;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <Button
      type="button"
      variant="outline"
      className={`jgis-story-editor-segment-mode-card${
        selected ? ' jgis-story-editor-segment-mode-card--selected' : ''
      }`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <div className="jgis-story-editor-row">
        <FontAwesomeIcon icon={icon} />
        <strong>{title}</strong>
      </div>
      <span>{description}</span>
    </Button>
  );
}
