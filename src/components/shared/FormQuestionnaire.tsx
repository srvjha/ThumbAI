'use client';

import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Check } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Questionnaire } from '../Questionarie';
import { cn } from '@/lib/utils';

interface FormQuestionnaireProps<T extends FieldValues> {
  control: Control<T>;
  choicesFieldName: Path<T>;
  questionnaireFieldName: Path<T>;
  questionnaireType?: 'youtube' | 'blog';
  errors: Record<string, any>;
}

const CHOICES = [
  {
    value: 'random',
    title: 'Let ThumbAI decide',
    description: 'Style picked from your prompt alone.',
  },
  {
    value: 'form',
    title: 'Guide the style',
    description: 'Answer a few questions on tone, colour and layout.',
  },
];

export const FormQuestionnaire = <T extends FieldValues>({
  control,
  choicesFieldName,
  questionnaireFieldName,
  questionnaireType,
  errors,
}: FormQuestionnaireProps<T>) => {
  const choiceError = errors[choicesFieldName as string];
  return (
    <Controller
      name={choicesFieldName}
      control={control}
      rules={{
        required: 'Please select a choice',
      }}
      render={({ field }) => (
        <div>
          <p className='mb-2 text-sm font-medium text-foreground'>Style</p>

          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            aria-invalid={!!choiceError}
            className='grid grid-cols-2 gap-2.5'
          >
            {CHOICES.map((choice) => {
              const id = `choice-${choice.value}`;
              const selected = field.value === choice.value;
              return (
                <Label
                  key={choice.value}
                  htmlFor={id}
                  className={cn(
                    'flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-3 font-normal transition-colors',
                    selected
                      ? 'border-brand bg-accent'
                      : choiceError
                        ? 'border-destructive bg-background'
                        : 'bg-background hover:border-foreground/20',
                  )}
                >
                  <span className='flex w-full items-center justify-between gap-2'>
                    <span className='text-sm font-medium'>{choice.title}</span>
                    <RadioGroupItem value={choice.value} id={id} />
                  </span>
                  <span className='text-xs leading-snug text-muted-foreground'>
                    {choice.description}
                  </span>
                </Label>
              );
            })}
          </RadioGroup>

          {choiceError && (
            <p className='mt-1.5 text-xs text-destructive'>
              {choiceError?.message}
            </p>
          )}

          {field.value === 'form' && (
            <div className='mt-3'>
              <Controller
                name={questionnaireFieldName}
                control={control}
                rules={{
                  required: 'Please complete the questionnaire',
                }}
                render={({ field: questionnaireField }) => {
                  const answered =
                    !!questionnaireField.value &&
                    Object.keys(questionnaireField.value).length > 0;
                  return (
                    <div className='space-y-2'>
                      <Questionnaire
                        type={questionnaireType}
                        hasAnswers={answered}
                        onComplete={(data) => questionnaireField.onChange(data)}
                      />
                      {answered && (
                        <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                          <Check className='size-3.5 text-brand' />
                          Style answers saved for this run.
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              {errors[questionnaireFieldName as string] && (
                <p className='mt-1.5 text-xs text-destructive'>
                  {errors[questionnaireFieldName as string]?.message}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    />
  );
};
