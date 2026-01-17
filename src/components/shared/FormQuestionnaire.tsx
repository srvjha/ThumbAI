'use client';

import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Questionnaire } from '../Questionarie';

interface FormQuestionnaireProps<T extends FieldValues> {
  control: Control<T>;
  choicesFieldName: Path<T>;
  questionnaireFieldName: Path<T>;
  questionnaireType?: 'youtube' | 'blog';
  errors: Record<string, any>;
}

export const FormQuestionnaire = <T extends FieldValues>({
  control,
  choicesFieldName,
  questionnaireFieldName,
  questionnaireType,
  errors,
}: FormQuestionnaireProps<T>) => {
  return (
    <Controller
      name={choicesFieldName}
      control={control}
      rules={{
        required: 'Please select a choice',
      }}
      render={({ field }) => (
        <div>
          <label className='block text-sm font-medium text-neutral-300 mb-2'>
            Choose Thumbnail Generation *
          </label>

          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className={`flex gap-6 p-3 rounded-lg ${
              errors[choicesFieldName as string]
                ? 'border border-red-500'
                : 'border border-neutral-700'
            }`}
          >
            <div className='flex items-center gap-3'>
              <RadioGroupItem value='random' id='choice-random' />
              <Label htmlFor='choice-random'>Random Generation</Label>
            </div>
            <div className='flex items-center gap-3'>
              <RadioGroupItem value='form' id='choice-form' />
              <Label htmlFor='choice-form'>Fill Form to Customize</Label>
            </div>
          </RadioGroup>

          {errors[choicesFieldName as string] && (
            <p className='text-red-400 text-xs mt-1'>
              {errors[choicesFieldName as string]?.message}
            </p>
          )}

          {field.value === 'form' && (
            <div className='mt-4'>
              <Controller
                name={questionnaireFieldName}
                control={control}
                rules={{
                  required: 'Please complete the questionnaire',
                }}
                render={({ field: questionnaireField }) => (
                  <Questionnaire
                    type={questionnaireType}
                    onComplete={(data) => questionnaireField.onChange(data)}
                  />
                )}
              />
              {errors[questionnaireFieldName as string] && (
                <p className='text-red-400 text-xs mt-1'>
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
