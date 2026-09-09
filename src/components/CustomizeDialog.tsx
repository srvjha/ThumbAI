'use client';

import React, { useRef, useState } from 'react';
import { MessageCircle, RefreshCcw, Copy, Sparkles } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { UIMessage } from 'ai';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from './ai-elements/conversation';
import { Message, MessageContent } from './ai-elements/message';
import { Response } from './ai-elements/response';
import { Action, Actions } from './ai-elements/actions';
import { Loader } from './ai-elements/loader';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from './ai-elements/prompt-input';
import { Button } from './ui/button';
import { ImageActionButtons } from './shared/ImageActionButtons';
import { ImageData } from './shared/imageUtils';

interface CustomizeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Every version produced so far. The last one is the newest. */
  versions: ImageData[];
  activeIndex: number;
  onSelectVersion: (index: number) => void;
  messages: UIMessage[];
  onSendMessage: (input: string) => void | Promise<unknown>;
  onRegenerate: () => void;
  chatStatus: string;
  isGenerating: boolean;
  /** Credits one edit costs, shown so the spend is never silent. */
  creditCost: number;
}

/**
 * Conversational editing for a generated image.
 *
 * Replaces a draggable 400x400 floating window that did not show the image
 * being edited — you were describing changes to something you could not see,
 * because the result sat in the panel behind the popout. Here the image is
 * the left half of the surface and the conversation is the right, so both are
 * visible at once. Each edit is kept as a version rather than overwriting the
 * last, since every one of them cost a credit.
 */
export const CustomizeDialog: React.FC<CustomizeDialogProps> = ({
  isOpen,
  onClose,
  versions,
  activeIndex,
  onSelectVersion,
  messages,
  onSendMessage,
  onRegenerate,
  chatStatus,
  isGenerating,
  creditCost,
}) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useUser();

  const active = versions[activeIndex] ?? versions[versions.length - 1];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    const value = input;
    setInput('');
    await onSendMessage(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton
        // Radix focuses the first focusable child on open, which landed on an
        // image action button and revealed the image's hover overlay. Put the
        // caret in the prompt instead, which is where you want it anyway.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        className='flex flex-col max-w-[min(1100px,95vw)] sm:max-w-[min(1100px,95vw)] h-[90vh] p-0 gap-0 overflow-hidden bg-neutral-950 border-neutral-800'
      >
        <DialogHeader className='shrink-0 px-5 py-3 border-b border-neutral-800'>
          <DialogTitle className='flex items-center gap-2 text-neutral-100 text-base'>
            <MessageCircle className='w-4 h-4 text-brand' />
            Customize
          </DialogTitle>
          <DialogDescription className='text-neutral-400 text-xs'>
            Describe a change and the image is regenerated. Every version is
            kept.
          </DialogDescription>
        </DialogHeader>

        {/* Split on desktop, stacked on mobile. */}
        <div className='flex-1 min-h-0 grid overflow-y-auto lg:overflow-hidden lg:grid-cols-[minmax(0,1fr)_420px]'>
          {/* Image pane */}
          <section className='min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-neutral-800 bg-neutral-900/30'>
            <div className='flex-1 min-h-0 flex items-center justify-center p-5'>
              {active?.url ? (
                <div className='relative group max-h-full'>
                  <img
                    src={active.url}
                    alt={`Version ${activeIndex + 1}`}
                    className='max-h-[46vh] lg:max-h-[62vh] w-auto rounded-lg border border-neutral-700 object-contain'
                  />
                  <div className='absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                    <ImageActionButtons
                      imageUrl={active.url}
                      aspectRatio={active.aspectRatio}
                    />
                  </div>
                </div>
              ) : (
                <p className='text-sm text-neutral-500'>No image yet.</p>
              )}
            </div>

            {/* Version strip. Only meaningful once there is more than one. */}
            {versions.length > 1 && (
              <div className='px-5 pb-4 shrink-0'>
                <p className='text-xs text-neutral-500 mb-2'>
                  {versions.length} versions
                </p>
                <div className='flex gap-2 overflow-x-auto pb-1'>
                  {versions.map((version, index) => {
                    const selected = index === activeIndex;
                    return (
                      <button
                        key={`${version.url}-${index}`}
                        type='button'
                        onClick={() => onSelectVersion(index)}
                        aria-label={`Show version ${index + 1}`}
                        aria-pressed={selected}
                        className={`relative shrink-0 rounded-md overflow-hidden border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          selected
                            ? 'border-brand'
                            : 'border-neutral-700 hover:border-neutral-500'
                        }`}
                      >
                        <img
                          src={version.url}
                          alt=''
                          className='h-14 w-24 object-cover'
                        />
                        <span className='absolute bottom-0 right-0 px-1 text-[10px] leading-4 bg-neutral-950/80 text-neutral-300'>
                          v{index + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Chat pane */}
          <section className='flex flex-col min-h-[18rem] lg:min-h-0'>
            <div className='flex-1 min-h-0'>
              {messages.length === 0 ? (
                <div className='h-full flex flex-col items-center justify-center gap-3 px-6 text-center'>
                  <span className='flex h-9 w-9 items-center justify-center rounded-full bg-brand/15 text-brand'>
                    <Sparkles className='w-4 h-4' />
                  </span>
                  <p className='text-sm text-neutral-300'>
                    What would you like to change?
                  </p>
                  <p className='text-xs text-neutral-500 max-w-[24rem]'>
                    Try &ldquo;make the headline bigger&rdquo;, &ldquo;use a
                    darker background&rdquo;, or &ldquo;move the subject to the
                    left&rdquo;. Edits apply to the version shown here.
                  </p>
                </div>
              ) : (
                <Conversation className='h-full'>
                  <ConversationContent>
                    {messages.map((message) => {
                      const isLast =
                        messages[messages.length - 1].id === message.id;
                      return (
                        <Message key={message.id} from={message.role}>
                          <div className='flex items-start gap-2'>
                            {message.role === 'assistant' && (
                              <span className='mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand'>
                                <Sparkles className='w-3 h-3' />
                              </span>
                            )}

                            <MessageContent className='flex-1 select-text'>
                              {message.parts.map((part, i) =>
                                part.type === 'text' ? (
                                  <div key={`${message.id}-${i}`}>
                                    <Response>{part.text}</Response>
                                    {message.role === 'assistant' &&
                                      isLast && (
                                        <Actions className='mt-2'>
                                          <Action
                                            onClick={onRegenerate}
                                            label='Retry'
                                          >
                                            <RefreshCcw className='size-3' />
                                          </Action>
                                          <Action
                                            onClick={() =>
                                              navigator.clipboard.writeText(
                                                part.text,
                                              )
                                            }
                                            label='Copy'
                                          >
                                            <Copy className='size-3' />
                                          </Action>
                                        </Actions>
                                      )}
                                  </div>
                                ) : null,
                              )}
                            </MessageContent>

                            {message.role === 'user' && (
                              <Avatar className='mt-0.5 h-6 w-6 shrink-0'>
                                {/* The signed-in user's own picture, not a
                                    stock placeholder. */}
                                <AvatarImage
                                  src={user?.imageUrl}
                                  alt={user?.fullName ?? 'You'}
                                />
                                <AvatarFallback className='text-[10px]'>
                                  {user?.firstName?.[0]?.toUpperCase() ?? 'Y'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        </Message>
                      );
                    })}
                    {(chatStatus === 'submitted' || isGenerating) && <Loader />}
                  </ConversationContent>
                  <ConversationScrollButton />
                </Conversation>
              )}
            </div>

            <div className='shrink-0 border-t border-neutral-800 p-3'>
              <PromptInput onSubmit={handleSubmit}>
                <PromptInputTextarea
                  ref={inputRef}
                  value={input}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setInput(e.target.value)
                  }
                  placeholder='Ask for a change...'
                  className='min-h-[60px] bg-neutral-900 text-sm'
                />
                <PromptInputToolbar className='justify-between'>
                  <span className='pl-2 text-xs text-neutral-500'>
                    {creditCost} {creditCost === 1 ? 'credit' : 'credits'} per
                    edit
                  </span>
                  <PromptInputSubmit
                    disabled={!input.trim() || isGenerating}
                  />
                </PromptInputToolbar>
              </PromptInput>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface CustomizeButtonProps {
  onClick: () => void;
  hasMessages: boolean;
}

export const CustomizeButton: React.FC<CustomizeButtonProps> = ({
  onClick,
  hasMessages,
}) => (
  <Button
    type='button'
    variant='outline'
    size='lg'
    onClick={onClick}
    className='relative cursor-pointer border-neutral-600 text-neutral-300 hover:bg-neutral-800'
  >
    <MessageCircle className='w-4 h-4 mr-2' />
    Customize
    {hasMessages && (
      <span className='absolute -top-1 -right-1 h-2 w-2 rounded-full bg-brand' />
    )}
  </Button>
);
