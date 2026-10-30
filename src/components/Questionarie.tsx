import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { FileText, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useQuestionnaireStore } from '@/store/questionnaireStore';
import { useEffect } from 'react';

type QuestionnaireData = Record<string, string[]>;

type QuestionnaireProps = {
  type?: 'blog' | 'youtube';
  onComplete: (data: QuestionnaireData) => void;
  /** Whether answers were already submitted; only changes the button copy. */
  hasAnswers?: boolean;
};

export const Questionnaire = ({
  type = 'youtube',
  onComplete,
  hasAnswers = false,
}: QuestionnaireProps) => {
  // store
  const {
    isOpen,
    currentStep,
    answers,
    questions,
    setType,
    setIsOpen,
    toggleOption,
    nextStep,
    previousStep,
    completeQuestionnaire,
  } = useQuestionnaireStore();

  // Set the type when component mounts or type prop changes
  useEffect(() => {
    setType(type);
  }, [type, setType]);

  const handleComplete = () => {
    const finalAnswers = completeQuestionnaire();
    onComplete(finalAnswers);
  };

  const currentQuestion = questions[currentStep];
  const currentQuestionId = currentQuestion?.id as keyof QuestionnaireData;
  const progress = ((currentStep + 1) / questions.length) * 100;

  const isStepValid = () => {
    return answers[currentQuestionId]?.length > 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' className='w-full cursor-pointer'>
          <FileText className='size-4' />
          {hasAnswers
            ? 'Redo the style questions'
            : 'Answer the style questions'}
        </Button>
      </DialogTrigger>

      <DialogContent className='flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-4xl'>
        <DialogHeader className='shrink-0 border-b px-6 pb-5 pt-6'>
          <p className='text-xs tabular-nums text-muted-foreground'>
            {type === 'blog' ? 'Blog cover' : 'YouTube thumbnail'} · Question{' '}
            {currentStep + 1} of {questions.length}
          </p>
          <DialogTitle className='font-serif text-2xl tracking-tight'>
            {currentQuestion?.title}
          </DialogTitle>
          <div className='mt-3 h-1 w-full rounded-full bg-secondary'>
            <div
              className='h-1 rounded-full bg-brand transition-[width] duration-300'
              style={{ width: `${progress}%` }}
            />
          </div>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {currentQuestion?.options.map((option) => {
              const isSelected = answers[currentQuestionId]?.includes(
                option.value,
              );

              return (
                <button
                  key={option.value}
                  type='button'
                  aria-pressed={isSelected}
                  onClick={() => toggleOption(currentQuestionId, option.value)}
                  className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 ${
                    isSelected
                      ? 'border-brand bg-accent'
                      : 'bg-background hover:border-foreground/20'
                  }`}
                >
                  <span className='flex-1'>
                    <span className='mb-1 block text-sm font-medium text-foreground'>
                      {option.label}
                    </span>
                    <span className='block text-xs leading-snug text-muted-foreground'>
                      {option.description}
                    </span>
                  </span>
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                      isSelected
                        ? 'border-brand bg-brand text-brand-foreground'
                        : 'bg-card'
                    }`}
                  >
                    {isSelected && <Check className='size-3' strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className='flex shrink-0 justify-between border-t px-6 py-4'>
          <Button
            type='button'
            variant='outline'
            onClick={previousStep}
            disabled={currentStep === 0}
            className='cursor-pointer'
          >
            <ChevronLeft className='size-4' />
            Previous
          </Button>

          {currentStep === questions.length - 1 ? (
            <Button
              type='button'
              variant='brand'
              onClick={handleComplete}
              disabled={!isStepValid()}
              className='cursor-pointer'
            >
              Use these answers
              <Check className='size-4' />
            </Button>
          ) : (
            <Button
              type='button'
              variant='brand'
              onClick={nextStep}
              disabled={!isStepValid()}
              className='cursor-pointer'
            >
              Next
              <ChevronRight className='size-4' />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
