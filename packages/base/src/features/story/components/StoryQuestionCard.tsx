import React, { useEffect, useState } from 'react';

import {
  DEFAULT_QUESTION_PROMPT,
  gradeAnswer,
} from '@/src/features/story/utils/interactiveQuestion';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';

export interface IStoryQuestionCardProps {
  segmentId: string;
  prompt: string | undefined;
  acceptedAnswers: readonly string[] | undefined;
}

interface IAttempt {
  correct: boolean;
}

export function StoryQuestionCard({
  segmentId,
  prompt,
  acceptedAnswers,
}: IStoryQuestionCardProps): JSX.Element {
  const [guess, setGuess] = useState('');
  const [attempt, setAttempt] = useState<IAttempt | null>(null);
  const question = prompt?.trim() || DEFAULT_QUESTION_PROMPT;
  const answers = acceptedAnswers ?? [];
  const reveal = answers.find(answer => answer.trim())?.trim() ?? '';
  const isLocked = attempt !== null;

  useEffect(() => {
    setGuess('');
    setAttempt(null);
  }, [segmentId]);

  return (
    <form
      className="jgis-story-question"
      onSubmit={event => {
        event.preventDefault();
        if (isLocked || !guess.trim()) {
          return;
        }

        setAttempt({ correct: gradeAnswer(guess, answers) });
      }}
    >
      <p className="jgis-story-question-prompt">{question}</p>
      <Input
        value={guess}
        aria-label="Your answer"
        placeholder="Type an answer"
        disabled={isLocked}
        onChange={event => {
          setGuess(event.target.value);
        }}
      />
      <Button type="submit" disabled={isLocked || !guess.trim()}>
        Submit
      </Button>
      {attempt?.correct ? (
        <p
          className="jgis-story-question-result jgis-story-question-result--correct"
          role="status"
        >
          Correct
        </p>
      ) : null}
      {attempt && !attempt.correct ? (
        <p
          className="jgis-story-question-result jgis-story-question-result--incorrect"
          role="status"
        >
          {reveal ? `Incorrect. ${reveal}` : 'Incorrect'}
        </p>
      ) : null}
    </form>
  );
}
