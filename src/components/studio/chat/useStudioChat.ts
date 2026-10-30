'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/user/auth';
import { waitForGeneration } from '@/lib/waitForGeneration';
import { uploadFile } from '@/config/falClient';
import {
  DEFAULT_TIER,
  EDIT_MODEL,
  TEXT_TO_IMAGE_MODELS,
  isAspectRatio,
} from '@/config/models';
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
        ? [request.target.aspectRatio]
        : request.settings.aspectRatios;
      const id = uid();
      setTurns((prev) => [
        ...prev,
        {
          id,
          role: 'generation',
          phase: 'writing',
          request,
          ratios,
          images: [],
          startedAt: Date.now(),
        },
      ]);

      try {
        const referenceUrls = await resolveAttachments(request.attachments);
        // Each format is its own job; run them side by side.
        const perRatio = await Promise.all(
          ratios.map(async (aspectRatio) => {
            const res = await submitOne(request, aspectRatio, referenceUrls);
            if (!res.data.data.valid_prompt) {
              throw new Error(res.data.data.response ?? 'Invalid prompt');
            }
            patch(id, { phase: 'rendering' });
            const urls = await waitForGeneration(res.data.data.requestId);
            return urls.map((url) => ({ url, aspectRatio }));
          }),
        );
        const images = perRatio.flat();
        if (images.length === 0) throw new Error('No images came back.');
        patch(id, { phase: 'done', images });
        // A fresh result becomes the default thing follow-ups edit.
        setPickedTarget(null);
        setFollowLatest(true);
      } catch (err) {
        patch(id, { phase: 'failed', error: errorMessage(err) });
      } finally {
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
    balance: account?.credits,
    send,
    answerQuestions,
    rerun,
    reset,
    loadGeneration,
  };
};

export type StudioChat = ReturnType<typeof useStudioChat>;
