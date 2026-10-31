'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/user/auth';
import { waitForGeneration } from '@/hooks/user/generations';
import { uploadFile } from '@/config/falClient';
import {
  DEFAULT_TIER,
  EDIT_MODEL,
  TEXT_TO_IMAGE_MODELS,
  isAspectRatio,
} from '@/config/models';
import type { AspectRatio } from '@/config/models';
import type { ImageData } from '@/components/shared/imageUtils';
import type { GenerationItem } from '@/components/dashboard/types';
import { composePrompt } from '../presets';
import { modeById, type StudioMode } from '../modes';
import type {
  Attachment,
  ChatSettings,
  GenerationRequest,
  StyleAnswers,
  Turn,
} from './types';

const uid = () => crypto.randomUUID();

export const DEFAULT_SETTINGS: ChatSettings = {
  aspectRatios: ['16:9'],
  tier: DEFAULT_TIER,
  numImages: 1,
  outputFormat: 'jpeg',
  overlayText: '',
  stylePreset: '',
  guided: false,
};

/** Credits a request will take, mirroring what the API charges. */
export const costOf = (request: Omit<GenerationRequest, 'text'>) => {
  if (request.target) return EDIT_MODEL.creditsPerImage;
  const perImage =
    request.attachments.length > 0
      ? EDIT_MODEL.creditsPerImage
      : TEXT_TO_IMAGE_MODELS[request.settings.tier].creditsPerImage;
  return (
    perImage *
    request.settings.numImages *
    Math.max(request.settings.aspectRatios.length, 1)
  );
};

const isUrl = (text: string) => {
  try {
    const url = new URL(text.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Why this message can't be sent yet, or null when it can. */
export const sendBlocker = (
  mode: StudioMode,
  text: string,
  attachments: Attachment[],
  target: ImageData | null,
): string | null => {
  const trimmed = text.trim();
  if (target) return trimmed ? null : 'Describe the change you want.';
  if (mode === 'blog') {
    return isUrl(trimmed) ? null : 'Paste the full URL of a blog post.';
  }
  if (mode === 'image' && attachments.length === 0) {
    return 'Attach at least one image to work from.';
  }
  return trimmed.length >= 3 ? null : 'Describe the video in a few words.';
};

/**
 * "Make a 9:16 vertical version for Shorts" changes an edit's shape; any
 * other edit keeps the shape of the image it edits.
 */
const reshapeTo = (text: string, from: string): AspectRatio | null => {
  if (
    from !== '9:16' &&
    /\b9:16\b|\bvertical\b|\bfor (youtube )?shorts\b|\bshorts (cover|version|thumbnail)\b/i.test(
      text,
    )
  ) {
    return '9:16';
  }
  if (
    from !== '16:9' &&
    /\b16:9\b|\bhorizontal\b|\blandscape\b|\bwidescreen\b/i.test(text)
  ) {
    return '16:9';
  }
  return null;
};

/** The image model's display name, known before the server answers. */
const modelNameFor = (request: GenerationRequest) =>
  (request.target || request.attachments.length > 0
    ? EDIT_MODEL
    : TEXT_TO_IMAGE_MODELS[request.settings.tier]
  ).modelName;

const EDIT_SUGGESTIONS = [
  'Make the headline bigger and bolder',
  'Give the background more contrast so the subject pops',
  'Try a warmer, brighter colour palette',
];

const isAbort = (err: unknown) =>
  err instanceof DOMException && err.name === 'AbortError';

const cancelJob = (generationId: string) =>
  axios
    .post(`/api/me/generations/${generationId}/cancel`, null, {
      validateStatus: (status) => status < 500,
    })
    .then((res) => res.status)
    .catch(() => 0);

const errorMessage = (err: unknown) =>
  axios.isAxiosError(err)
    ? (err.response?.data?.message ?? err.message)
    : err instanceof Error
      ? err.message
      : 'Something went wrong.';

/**
 * The studio's conversation: user turns, the style questions, and image
 * turns that write a prompt, render, and land in the thread. A follow-up
 * edits an image already in the thread, so it stays in context.
 */
export const useStudioChat = (mode: StudioMode) => {
  const queryClient = useQueryClient();
  const { data: account, refetch: refetchAccount } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  // Explicit pick from an image's Edit; otherwise follow-ups use the latest.
  const [pickedTarget, setPickedTarget] = useState<ImageData | null>(null);
  const [followLatest, setFollowLatest] = useState(true);
  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  // In-flight runs by turn id, so Cancel can stop the wait and the jobs.
  const jobs = useRef(
    new Map<string, { controller: AbortController; ids: string[] }>(),
  );

  const workflow = modeById(mode).workflow;

  const latestImage = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      const turn = turns[i];
      if (turn.role === 'generation' && turn.images.length > 0) {
        return turn.images[0];
      }
    }
    return null;
  }, [turns]);

  const target = pickedTarget ?? (followLatest ? latestImage : null);

  // A ready-made next step for the composer, after a finished image.
  const suggestion = useMemo(() => {
    const last = turns[turns.length - 1];
    if (!target || last?.role !== 'generation' || last.phase !== 'done') {
      return null;
    }
    const shapes = new Set(
      turns.flatMap((t) =>
        t.role === 'generation' ? t.images.map((i) => i.aspectRatio) : [],
      ),
    );
    if (mode !== 'blog' && target.aspectRatio === '16:9' && !shapes.has('9:16')) {
      return 'Make a 9:16 vertical version of this thumbnail for Shorts';
    }
    if (target.aspectRatio === '9:16' && !shapes.has('16:9')) {
      return 'Make a 16:9 YouTube thumbnail version of this';
    }
    const done = turns.filter(
      (t) => t.role === 'generation' && t.phase === 'done',
    ).length;
    return EDIT_SUGGESTIONS[(done - 1) % EDIT_SUGGESTIONS.length];
  }, [turns, target, mode]);

  const busy = turns.some(
    (t) =>
      (t.role === 'generation' &&
        (t.phase === 'writing' || t.phase === 'rendering')) ||
      (t.role === 'questions' && t.state === 'asking'),
  );

  const patch = useCallback(
    (id: string, next: Partial<Extract<Turn, { role: 'generation' }>>) =>
      setTurns((prev) =>
        prev.map((t) =>
          t.id === id && t.role === 'generation' ? { ...t, ...next } : t,
        ),
      ),
    [],
  );

  /** Uploads local files once and keeps the URL for re-runs. */
  const resolveAttachments = async (attachments: Attachment[]) =>
    Promise.all(
      attachments.map(async (a) => {
        if (a.url) return a.url;
        const url = await uploadFile(a.file as File);
        a.url = url;
        return url;
      }),
    );

  const submitOne = async (
    request: GenerationRequest,
    aspectRatio: string,
    referenceUrls: string[],
  ) => {
    const { settings: s, answers, target: edit, text } = request;
    const style = answers
      ? { choices: 'form', userChoices: answers }
      : { choices: 'random', userChoices: '' };

    if (edit) {
      return axios.post('/api/edit', {
        mode: 'chat',
        prompt: text,
        numImages: 1,
        outputFormat: s.outputFormat,
        images_urls: [edit.url, ...referenceUrls],
        aspectRatio,
        workflow,
      });
    }
    if (referenceUrls.length > 0) {
      return axios.post('/api/edit', {
        mode: 'normal',
        prompt: composePrompt(text, s.overlayText, s.stylePreset),
        numImages: s.numImages,
        outputFormat: s.outputFormat,
        images_urls: referenceUrls,
        aspectRatio,
        workflow: 'IMAGE_TO_IMAGE',
        ...style,
      });
    }
    if (mode === 'blog') {
      return axios.post('/api/generate', {
        blogUrl: text.trim(),
        numImages: s.numImages,
        outputFormat: s.outputFormat,
        aspectRatio,
        workflow: 'URL_TO_IMAGE',
        tier: s.tier,
        ...style,
      });
    }
    return axios.post('/api/generate', {
      prompt: composePrompt(text, s.overlayText, s.stylePreset),
      numImages: s.numImages,
      outputFormat: s.outputFormat,
      aspectRatio,
      workflow: 'TEXT_TO_IMAGE',
      tier: s.tier,
      ...style,
    });
  };

  const run = useCallback(
    async (request: GenerationRequest) => {
      const cost = costOf(request);
      if (account?.credits !== undefined && account.credits < cost) {
        toast.error(
          `This needs ${cost} credits and you have ${account.credits}.`,
        );
        return;
      }

      const ratios = request.target
        ? [
            reshapeTo(request.text, request.target.aspectRatio) ??
              request.target.aspectRatio,
          ]
        : request.settings.aspectRatios;
      const id = uid();
      const startedAt = Date.now();
      const job = { controller: new AbortController(), ids: [] as string[] };
      const { signal } = job.controller;
      jobs.current.set(id, job);
      setTurns((prev) => [
        ...prev,
        {
          id,
          role: 'generation',
          phase: 'writing',
          request,
          ratios,
          images: [],
          startedAt,
          modelName: modelNameFor(request),
          generationIds: [],
        },
      ]);

      try {
        const referenceUrls = await resolveAttachments(request.attachments);
        // Each format is its own job; run them side by side.
        const perRatio = await Promise.all(
          ratios.map(async (aspectRatio) => {
            const res = await submitOne(request, aspectRatio, referenceUrls);
            const data = res.data.data;
            if (!data.valid_prompt) {
              throw new Error(data.response ?? 'Invalid prompt');
            }
            const generationId: string = data.generationId;
            job.ids.push(generationId);
            // Cancelled while the prompt was being written: the job exists
            // now, so stop it too.
            if (signal.aborted) {
              void cancelJob(generationId);
              throw new DOMException('Aborted', 'AbortError');
            }
            setTurns((prev) =>
              prev.map((t) =>
                t.id === id && t.role === 'generation'
                  ? {
                      ...t,
                      phase: 'rendering',
                      generationIds: [...(t.generationIds ?? []), generationId],
                      // The first format to come back speaks for the turn.
                      writingMs: t.writingMs ?? Date.now() - startedAt,
                      reply: t.reply ?? data.reply ?? null,
                      archetype: t.archetype ?? data.archetype ?? null,
                      headline: t.headline ?? data.headline ?? null,
                      modelName: data.modelName ?? t.modelName,
                    }
                  : t,
              ),
            );
            const urls = await waitForGeneration(queryClient, generationId, {
              signal,
            });
            return urls.map((url) => ({ url, aspectRatio }));
          }),
        );
        if (signal.aborted) return;
        const images = perRatio.flat();
        if (images.length === 0) throw new Error('No images came back.');
        patch(id, { phase: 'done', images, finishedAt: Date.now() });
        // A fresh result becomes the default thing follow-ups edit.
        setPickedTarget(null);
        setFollowLatest(true);
      } catch (err) {
        // cancel() has already marked the turn.
        if (signal.aborted || isAbort(err)) return;
        patch(id, {
          phase: 'failed',
          error: errorMessage(err),
          finishedAt: Date.now(),
        });
      } finally {
        jobs.current.delete(id);
        // Failed jobs are refunded server side; resync either way.
        refetchAccount();
        queryClient.invalidateQueries({ queryKey: ['me', 'generations'] });
      }
    },
    // submitOne and resolveAttachments only read their arguments and mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account?.credits, patch, refetchAccount, queryClient, mode, workflow],
  );

  const send = useCallback(
    (
      text: string,
      attachments: Attachment[],
      options: { target?: ImageData | null } = {},
    ) => {
      const editTarget = options.target === undefined ? target : options.target;
      const request: GenerationRequest = {
        text: text.trim(),
        target: editTarget ?? undefined,
        attachments,
        settings,
      };
      setTurns((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'user',
          text: request.text,
          attachments,
          target: editTarget ?? undefined,
        },
      ]);
      setPickedTarget(null);

      if (settings.guided && !editTarget) {
        setTurns((prev) => [
          ...prev,
          { id: uid(), role: 'questions', state: 'asking', request },
        ]);
        return;
      }
      void run(request);
    },
    [run, settings, target],
  );

  /** Answers (or null to skip) for the questions turn, then generate. */
  const answerQuestions = useCallback(
    (id: string, answers: StyleAnswers | null) => {
      const turn = turnsRef.current.find((t) => t.id === id);
      if (!turn || turn.role !== 'questions' || turn.state !== 'asking') return;
      setTurns((prev) =>
        prev.map((t) =>
          t.id === id && t.role === 'questions'
            ? {
                ...t,
                state: answers ? 'done' : 'skipped',
                answers: answers ?? undefined,
              }
            : t,
        ),
      );
      void run({ ...turn.request, answers: answers ?? undefined });
    },
    [run],
  );

  /** Same request again; the server picks a new seed. */
  const rerun = useCallback(
    (id: string) => {
      const turn = turnsRef.current.find((t) => t.id === id);
      if (turn?.role === 'generation') void run(turn.request);
    },
    [run],
  );

  /**
   * Stops a run. The server refunds what it charged; a job that already
   * finished can't be cancelled, so that run is left to land.
   */
  const cancel = useCallback(
    async (id: string) => {
      const job = jobs.current.get(id);
      if (!job) return;
      const statuses = await Promise.all(job.ids.map(cancelJob));
      if (statuses.length > 0 && statuses.every((s) => s === 409)) {
        toast('It had already finished.');
        return;
      }
      job.controller.abort();
      patch(id, { phase: 'cancelled', finishedAt: Date.now() });
    },
    [patch],
  );

  const rate = useCallback(
    (id: string, feedback: 'up' | 'down') => {
      const turn = turnsRef.current.find((t) => t.id === id);
      if (turn?.role !== 'generation') return;
      patch(id, { feedback: turn.feedback === feedback ? null : feedback });
    },
    [patch],
  );

  const pickTarget = useCallback((image: ImageData | null) => {
    setPickedTarget(image);
    setFollowLatest(image !== null);
  }, []);

  const reset = useCallback(() => {
    setTurns([]);
    setPickedTarget(null);
    setFollowLatest(true);
  }, []);

  /** Opens a past generation as the start of a conversation. */
  const loadGeneration = useCallback((item: GenerationItem) => {
    const ratio =
      item.aspect_ratio && isAspectRatio(item.aspect_ratio)
        ? item.aspect_ratio
        : '16:9';
    const images = item.image_url.map((url) => ({ url, aspectRatio: ratio }));
    setTurns([
      {
        id: uid(),
        role: 'user',
        text: item.prompt?.trim() || 'Past generation',
        attachments: [],
      },
      {
        id: uid(),
        role: 'generation',
        phase: 'done',
        ratios: [ratio],
        images,
        startedAt: Date.parse(item.createdAt) || Date.now(),
        finishedAt: Date.parse(item.createdAt) || Date.now(),
        request: {
          text: item.prompt ?? '',
          attachments: [],
          settings: { ...DEFAULT_SETTINGS, aspectRatios: [ratio] },
        },
      },
    ]);
    setPickedTarget(null);
    setFollowLatest(true);
  }, []);

  return {
    turns,
    settings,
    setSettings,
    target,
    pickTarget,
    busy,
    suggestion,
    balance: account?.credits,
    send,
    answerQuestions,
    rerun,
    cancel,
    rate,
    reset,
    loadGeneration,
  };
};

export type StudioChat = ReturnType<typeof useStudioChat>;
