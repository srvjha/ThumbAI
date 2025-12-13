import { useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { FileText, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { blogQuestionarie, youtubeQuestionarie } from '@/utils/questionarie';

type QuestionnaireData = {
  blogType: string[];
  audience: string[];
  colorScheme: string[];
  tone: string[];
};

type QuestionnaireProps = {
  type?: string,
  onComplete: (data: QuestionnaireData) => void;
};



export const Questionnaire = ({
  type,
  onComplete,
}: QuestionnaireProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [questions, setQuestions] = useState(youtubeQuestionarie)
  const [answers, setAnswers] = useState<QuestionnaireData>({
    blogType: [],
    tone: [],
    audience: [],
    colorScheme: [],

  });
  if (type === "blog") {
    setQuestions(blogQuestionarie)
  }

  const handleOptionToggle = (
    questionId: keyof QuestionnaireData,
    value: string,
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: prev[questionId].includes(value)
        ? prev[questionId].filter((item) => item !== value)
        : [...prev[questionId], value],
    }));
  };

  const isStepValid = () => {
    const currentQuestionId = questions[currentStep]
      .id as keyof QuestionnaireData;
    return answers[currentQuestionId].length > 0;
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };
  const handleComplete = () => {
    onComplete(answers);

    setIsOpen(false);
    setCurrentStep(0);
    setAnswers({
      blogType: [],
      tone: [],
      audience: [],
      colorScheme: [],
    });
  };

  const currentQuestion = questions[currentStep];
  const currentQuestionId = currentQuestion.id as keyof QuestionnaireData;
  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          className='cursor-pointer border-neutral-600 text-neutral-300 hover:bg-neutral-800 w-full'
        >
          <FileText className='w-4 h-4 mr-2' />
          Smart Fill with Questionnaire
        </Button>
      </DialogTrigger>

      <DialogContent className='bg-neutral-900 border-neutral-700 text-neutral-100 min-w-6xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-xl font-semibold'>
            YouTube Thumbnail Questionnaire
          </DialogTitle>
          <div className='w-full bg-neutral-800 rounded-full h-2 mt-4'>
            <div
              className='bg-gradient-to-r from-green-500 to-orange-500 h-2 rounded-full transition-all duration-300'
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className='text-sm text-neutral-400 mt-2'>
            Question {currentStep + 1} of {questions.length}
          </p>
        </DialogHeader>

        <div className='-mt-10 '>
          <Card className='bg-transparent border-none'>
            <CardContent className='p-6'>
              <h3 className='text-lg font-medium mb-4 text-neutral-100'>
                {currentQuestion.title}
              </h3>

              <div className='space-y-3 flex flex-wrap gap-4'>
                {currentQuestion.options.map((option) => {
                  const isSelected = answers[currentQuestionId].includes(
                    option.value,
                  );

                  return (
                    <div
                      key={option.value}
                      onClick={() =>
                        handleOptionToggle(currentQuestionId, option.value)
                      }
                      className={`relative w-full sm:w-[280px] md:w-[300px] lg:w-[320px] h-[120px]  p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-neutral-600 hover:border-neutral-500 bg-neutral-750'
                        }`}
                    >
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          <h4 className='font-medium text-neutral-100 mb-1'>
                            {option.label}
                          </h4>
                          <p className='text-sm text-neutral-400'>
                            {option.description}
                          </p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ml-3 ${isSelected
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-neutral-500'
                            }`}
                        >
                          {isSelected && (
                            <Check className='w-4 h-4 text-white' />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* {answers[currentQuestionId].length > 0 && (
                <p className="text-sm text-neutral-400 mt-4">
                  Selected: {answers[currentQuestionId].length} option{answers[currentQuestionId].length !== 1 ? 's' : ''}
                </p>
              )} */}
            </CardContent>
          </Card>
        </div>

        <div className='flex justify-between -mt-6'>
          <Button
            variant='outline'
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className='cursor-pointer border-neutral-600 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50'
          >
            <ChevronLeft className='w-4 h-4 mr-0' />
            Previous
          </Button>

          {currentStep === questions.length - 1 ? (
            <Button
              onClick={handleComplete}
              disabled={!isStepValid()}
              className='cursor-pointer bg-gradient-to-r from-neutral-100 to-neutral-200 text-neutral-900 hover:from-neutral-600 hover:to-neutral-700 hover:text-white disabled:opacity-50'
            >
              Complete & Fill Form
              <Check className='w-4 h-4 ml-0' />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!isStepValid()}
              className='cursor-pointer bg-gradient-to-r from-neutral-200 to-neutral-300 text-neutral-900 hover:from-neutral-300 hover:to-neutral-400 disabled:opacity-50'
            >
              Next
              <ChevronRight className='w-4 h-4 ml-2' />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
