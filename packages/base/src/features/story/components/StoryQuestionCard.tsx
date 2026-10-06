import React, { useEffect, useState } from 'react';

import { DEFAULT_QUESTION_PROMPT } from '@/src/features/story/utils/interactiveQuestion';
import { Input } from '@/src/shared/components/Input';

export interface IStoryQuestionCardProps {
  segmentId: string;
  prompt: string | undefined;
}

export function StoryQuestionCard({
  segmentId,
  prompt,
}: IStoryQuestionCardProps): JSX.Element {
  const [guess, setGuess] = useState('');
  const question = prompt?.trim() || DEFAULT_QUESTION_PROMPT;

  useEffect(() => {
    setGuess('');
  }, [segmentId]);

  return (
    <form
      className="jgis-story-question"
      onSubmit={event => {
        event.preventDefault();
      }}
    >
      <p className="jgis-story-question-prompt">{question}</p>
      <Input
        value={guess}
        aria-label="Your answer"
        placeholder="Type an answer"
        onChange={event => {
          setGuess(event.target.value);
        }}
      />
    </form>
  );
}
