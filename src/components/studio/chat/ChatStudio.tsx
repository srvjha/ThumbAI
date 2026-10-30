'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  FileText,
  History as HistoryIcon,
  ImagePlus,
  SquarePen,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { useGeneration } from '@/hooks/user/generations';
import type { ImageData } from '@/components/shared/imageUtils';
import { HistoryRail } from '../HistoryRail';
import { STUDIO_MODES, modeById, type StudioMode } from '../modes';
import { ChatComposer, type ChatComposerHandle } from './ChatComposer';
import { ImageTurn } from './ImageTurn';
import { QuestionCard } from './QuestionCard';
import { useStudioChat } from './useStudioChat';
import type { Turn } from './types';
import { cn } from '@/lib/utils';

// The feed mock is only needed once someone opens it.
const FeedPreview = dynamic(
  () => import('../preview/FeedPreview').then((m) => m.FeedPreview),
  { ssr: false },
);

const MODE_ICONS: Record<StudioMode, typeof Type> = {
  text: Type,
  image: ImagePlus,
  blog: FileText,
};

const INTRO: Record<StudioMode, { title: string; hint: string }> = {
  text: {
    title: 'What’s your video about?',
    hint: 'Describe it like you would to a designer. Follow-ups edit the result.',
  },
  image: {
    title: 'What should we make from your image?',
    hint: 'Attach a photo, product shot or screenshot with +, then say what you want.',
  },
  blog: {
    title: 'Which post needs a cover?',
    hint: 'Paste a public article URL. ThumbAI reads it and designs the cover.',
  },
};

const SUGGESTIONS: Record<StudioMode, string[]> = {
  text: [
    'I tested five budget mechanical keyboards for a month',
    'Day 100 surviving a frozen open world',
    'Where my salary actually goes every month',
    'I cooked every viral TikTok pasta so you don’t have to',
  ],
  image: [
    'Put me on a shocked-reaction thumbnail with a bold yellow title',
    'Turn this product photo into a clean, bright review thumbnail',
    'Make this screenshot a tutorial thumbnail with a big arrow',
  ],
  blog: [],
};

const ModeSwitcher = ({ mode }: { mode: StudioMode }) => {
  const router = useRouter();
  useEffect(() => {
    STUDIO_MODES.forEach((m) => m.id !== mode && router.prefetch(m.href));
  }, [mode, router]);

  return (
    <ToggleGroup
      type='single'
      value={mode}
      onValueChange={(value) => {
        if (value && value !== mode) {
          router.push(modeById(value as StudioMode).href);
        }
      }}
      aria-label='Studio mode'
      className='h-9 rounded-full bg-secondary p-0.5'
    >
      {STUDIO_MODES.map((m) => {
        const Icon = MODE_ICONS[m.id];
        return (
          <ToggleGroupItem
            key={m.id}
            value={m.id}
            className='h-8 gap-1.5 rounded-full! px-3 text-[13px] font-medium text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs'
          >
            <Icon className='size-4' />
            <span className='max-sm:sr-only'>{m.label}</span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
};

const UserBubble = ({ turn }: { turn: Extract<Turn, { role: 'user' }> }) => (
  <div className='flex flex-col items-end gap-2'>
    {(turn.target || turn.attachments.length > 0) && (
      <div className='flex flex-wrap justify-end gap-2'>
        {turn.target && (
          <img
            src={turn.target.url}
            alt='Image being edited'
            className={cn(
              'rounded-xl border object-cover',
              turn.target.aspectRatio === '9:16' ? 'h-24 w-14' : 'h-16 w-28',
            )}
          />
        )}
        {turn.attachments.map((a) => (
          <img
            key={a.id}
            src={a.previewUrl}
            alt='Attached image'
            className='size-16 rounded-xl border object-cover'
          />
        ))}
      </div>
    )}
    {turn.text && (
      <p className='max-w-[85%] whitespace-pre-wrap break-words rounded-3xl bg-secondary px-4 py-2.5 text-[15px] leading-relaxed'>
        {turn.text}
      </p>
    )}
  </div>
);

/**
 * The studio as a conversation. Empty, it is a headline, suggestions and the
 * input in the middle of the screen; once something is sent, the thread
 * fills the page and the input docks to the bottom.
 */
export const ChatStudio = ({ mode }: { mode: StudioMode }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chat = useStudioChat(mode);
  const composer = useRef<ChatComposerHandle>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [preview, setPreview] = useState<{
    image: ImageData;
    title: string;
  } | null>(null);

  const empty = chat.turns.length === 0;
  const intro = INTRO[mode];
  const questionKind = mode === 'blog' ? 'blog' : 'youtube';

  // ?from=<id>: open a past generation, e.g. from the library. Wrong mode
  // for it? Hop to the right one, keeping the param.
  const fromId = searchParams.get('from');
  const deepLink = useGeneration(fromId);
  const appliedFrom = useRef<string | null>(null);
  const { loadGeneration } = chat;
  useEffect(() => {
    const gen = deepLink.data;
    if (!gen || appliedFrom.current === gen.id) return;
    const target = STUDIO_MODES.find((m) => m.workflow === gen.model_used);
    if (target && target.id !== mode) {
      router.replace(`${target.href}?from=${gen.id}`);
      return;
    }
    appliedFrom.current = gen.id;
    if (gen.status !== 'COMPLETED' || gen.image_url.length === 0) {
      toast.error('That generation has no finished images to open.');
      return;
    }
    loadGeneration(gen);
  }, [deepLink.data, mode, router, loadGeneration]);

  useEffect(() => {
    if (deepLink.isError) toast.error('Couldn’t open that generation.');
  }, [deepLink.isError]);

  // ⌘/Ctrl+H toggles history (⇧ too, since macOS keeps ⌘H for itself).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setHistoryOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const promptBefore = (index: number) => {
    for (let i = index; i >= 0; i -= 1) {
      const turn = chat.turns[i];
      if (turn.role === 'user' && turn.text) return turn.text;
    }
    return '';
  };

  const input = (
    <ChatComposer ref={composer} mode={mode} chat={chat} autoFocus />
  );

  return (
    <div className='relative flex h-[calc(100svh-3rem)] flex-col'>
      <div className='grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 md:px-5'>
        <div>
          {!empty && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={chat.reset}
              disabled={chat.busy}
              className='gap-1.5 text-muted-foreground hover:text-foreground'
            >
              <SquarePen className='size-4' />
              <span className='max-sm:sr-only'>New chat</span>
            </Button>
          )}
        </div>
        <ModeSwitcher mode={mode} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={() => setHistoryOpen(true)}
              aria-label='History'
              className='size-9 justify-self-end text-muted-foreground hover:text-foreground'
            >
              <HistoryIcon className='size-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>History</TooltipContent>
        </Tooltip>
      </div>

      <AnimatePresence mode='wait' initial={false}>
        {empty ? (
          <motion.div
            key='empty'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className='flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-[10svh]'
          >
            <div className='w-full max-w-[44rem]'>
              <h1 className='text-center font-serif text-3xl tracking-tight text-balance sm:text-4xl'>
                {intro.title}
              </h1>
              <p className='mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground text-pretty'>
                {intro.hint}
              </p>

              {SUGGESTIONS[mode].length > 0 && (
                <div className='mt-8 grid gap-2 sm:grid-cols-2'>
                  {SUGGESTIONS[mode].map((text) => (
                    <button
                      key={text}
                      type='button'
                      onClick={() => composer.current?.setText(text)}
                      className='group flex items-start justify-between gap-3 rounded-2xl border bg-card/60 px-4 py-3 text-left text-sm transition-colors hover:border-foreground/20 hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
                    >
                      <span className='text-pretty'>{text}</span>
                      <ArrowUpRight className='mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground' />
                    </button>
                  ))}
                </div>
              )}

              <div className='mt-4'>{input}</div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key='thread'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className='flex min-h-0 flex-1 flex-col'
          >
            <Conversation className='min-h-0'>
              <ConversationContent className='mx-auto flex w-full max-w-[46rem] flex-col gap-8 px-4 pb-10 pt-4'>
                {chat.turns.map((turn, index) => (
                  <motion.div
                    key={turn.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    {turn.role === 'user' ? (
                      <UserBubble turn={turn} />
                    ) : turn.role === 'questions' ? (
                      <QuestionCard
                        kind={questionKind}
                        state={turn.state}
                        answers={turn.answers}
                        onDone={(answers) =>
                          chat.answerQuestions(turn.id, answers)
                        }
                      />
                    ) : (
                      <ImageTurn
                        phase={turn.phase}
                        ratios={turn.ratios}
                        images={turn.images}
                        error={turn.error}
                        startedAt={turn.startedAt}
                        format={turn.request.settings.outputFormat}
                        busy={chat.busy}
                        target={chat.target}
                        onEdit={(image, text) =>
                          chat.send(text, [], { target: image })
                        }
                        onVary={() => chat.rerun(turn.id)}
                        onPreview={(image) =>
                          setPreview({ image, title: promptBefore(index) })
                        }
                      />
                    )}
                  </motion.div>
                ))}
              </ConversationContent>
              <ConversationScrollButton className='bottom-3' />
            </Conversation>

            <div className='shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]'>
              <div className='mx-auto w-full max-w-[46rem]'>{input}</div>
              <p className='mx-auto mt-2 max-w-[46rem] text-center text-[11px] text-muted-foreground'>
                Follow-ups edit the highlighted image. Credits are refunded if a
                run fails.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side='right' className='w-full gap-0 p-0 sm:max-w-sm'>
          <SheetTitle className='sr-only'>History</SheetTitle>
          <SheetDescription className='sr-only'>
            Your recent generations. Pick one to continue from it.
          </SheetDescription>
          <HistoryRail
            workflow={modeById(mode).workflow}
            activeId={null}
            onSelect={(item) => {
              chat.loadGeneration(item);
              setHistoryOpen(false);
            }}
            headerClassName='pr-12'
          />
        </SheetContent>
      </Sheet>

      {preview && (
        <FeedPreview
          images={[preview.image.url]}
          title={preview.title || undefined}
          open
          onOpenChange={(open) => !open && setPreview(null)}
        />
      )}
    </div>
  );
};
