'use client';

/**
 * Resolves once a queued generation finishes.
 *
 * All three workflows now submit to Fal's queue and learn the outcome from
 * /api/result-stream, so the subscribe-and-close dance lives here rather than
 * being repeated (and drifting) in each component.
 */
export const waitForGeneration = (
  requestId: string,
  options: {
    onStatus?: (status: string) => void;
    signal?: AbortSignal;
  } = {},
): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const source = new EventSource(
      `/api/result-stream?requestId=${encodeURIComponent(requestId)}`,
    );

    const settle = (fn: () => void) => {
      source.close();
      options.signal?.removeEventListener('abort', onAbort);
      fn();
    };

    function onAbort() {
      settle(() => reject(new DOMException('Aborted', 'AbortError')));
    }

    options.signal?.addEventListener('abort', onAbort);

    source.onmessage = (event) => {
      let payload: {
        status?: string;
        image_url?: string;
        image_urls?: string[];
      };

      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload.status === 'COMPLETED') {
        // Prefer the full set; fall back to the single-url field.
        const urls =
          payload.image_urls?.length
            ? payload.image_urls
            : payload.image_url
              ? [payload.image_url]
              : [];
        settle(() => resolve(urls));
        return;
      }

      if (payload.status === 'FAILED') {
        settle(() => reject(new Error('Generation failed')));
        return;
      }

      if (payload.status === 'TIMEOUT') {
        settle(() =>
          reject(new Error('Generation timed out. Please try again.')),
        );
        return;
      }

      if (payload.status) {
        options.onStatus?.(payload.status);
      }
    };

    source.onerror = () => {
      settle(() => reject(new Error('Lost connection while generating')));
    };
  });
