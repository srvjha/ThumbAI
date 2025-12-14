import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { blogQuestionarie, youtubeQuestionarie } from '@/utils/questionarie';

export type QuestionnaireType = 'blog' | 'youtube';

type QuestionnaireData = Record<string, string[]>;

type QuestionarieQuestion = {
    id: string;
    title: string;
    options: {
        value: string;
        label: string;
        description: string;
    }[];
};

interface QuestionnaireState {
    // State
    type: QuestionnaireType;
    isOpen: boolean;
    currentStep: number;
    answers: QuestionnaireData;
    questions: QuestionarieQuestion[];

    // Actions
    setType: (type: QuestionnaireType) => void;
    setIsOpen: (isOpen: boolean) => void;
    setCurrentStep: (step: number) => void;
    toggleOption: (questionId: string, value: string) => void;
    nextStep: () => void;
    previousStep: () => void;
    resetQuestionnaire: () => void;
    completeQuestionnaire: () => QuestionnaireData;
}

const getBlogInitialAnswers = (): QuestionnaireData => ({
    blogType: [],
    tone: [],
    audience: [],
    colorScheme: [],
    thumbnailStyle: [],
});

const getYoutubeInitialAnswers = (): QuestionnaireData => ({
    category: [],
    appearance: [],
    colorScheme: [],
    thumbnailStyle: [],
    audience: [],
    emotion: [],
});

const getInitialAnswers = (type: QuestionnaireType): QuestionnaireData => {
    return type === 'blog' ? getBlogInitialAnswers() : getYoutubeInitialAnswers();
};

const getQuestions = (type: QuestionnaireType): QuestionarieQuestion[] => {
    return type === 'blog' ? (blogQuestionarie as QuestionarieQuestion[]) : (youtubeQuestionarie as QuestionarieQuestion[]);
};

export const useQuestionnaireStore = create<QuestionnaireState>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                type: 'youtube',
                isOpen: false,
                currentStep: 0,
                answers: getYoutubeInitialAnswers(),
                questions: youtubeQuestionarie as QuestionarieQuestion[],

                // Actions
                setType: (type) =>
                    set((state) => {
                        // Only update if type actually changed
                        if (state.type === type) return state;

                        return {
                            type,
                            questions: getQuestions(type),
                            answers: getInitialAnswers(type),
                            currentStep: 0,
                        };
                    }),

                setIsOpen: (isOpen) =>
                    set((state) => {
                        // Reset when opening
                        if (isOpen && !state.isOpen) {
                            return {
                                isOpen,
                                currentStep: 0,
                                answers: getInitialAnswers(state.type),
                            };
                        }
                        return { isOpen };
                    }),

                setCurrentStep: (step) => set({ currentStep: step }),

                toggleOption: (questionId, value) =>
                    set((state) => ({
                        answers: {
                            ...state.answers,
                            [questionId]: state.answers[questionId]?.includes(value)
                                ? state.answers[questionId].filter((item) => item !== value)
                                : [...(state.answers[questionId] || []), value],
                        },
                    })),

                nextStep: () =>
                    set((state) => ({
                        currentStep:
                            state.currentStep < state.questions.length - 1
                                ? state.currentStep + 1
                                : state.currentStep,
                    })),

                previousStep: () =>
                    set((state) => ({
                        currentStep: state.currentStep > 0 ? state.currentStep - 1 : 0,
                    })),

                resetQuestionnaire: () =>
                    set((state) => ({
                        currentStep: 0,
                        answers: getInitialAnswers(state.type),
                    })),

                completeQuestionnaire: () => {
                    const answers = get().answers;
                    set({
                        isOpen: false,
                        currentStep: 0,
                        answers: getInitialAnswers(get().type),
                    });
                    return answers;
                },
            }),
            {
                name: 'questionnaire-storage', // localStorage key
                partialize: (state) => ({
                    // Only persist type, not the entire state
                    type: state.type,
                }),
            }
        ),
        {
            name: 'QuestionnaireStore', // DevTools name
        }
    )
);
