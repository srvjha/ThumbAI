'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { frameClass } from './frame';

const GAP = 9;
const FRAME_MS = 1000 / 30;

/**
 * A field of dots drifting through soft waves of brightness, drawn in the
 * text colour so it suits either theme. One still frame with reduced motion.
 */
const DotField = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const colour = getComputedStyle(canvas).color;
    const seeds: number[] = [];
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.ceil(w / GAP) * Math.ceil(h / GAP);
      while (seeds.length < count) seeds.push(Math.random() * Math.PI * 2);
    };

    const draw = (time: number) => {
      const t = time / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = colour;
      const cols = Math.ceil(w / GAP);
      for (let y = 0; y < h; y += GAP) {
        for (let x = 0; x < w; x += GAP) {
          const c = x / GAP;
          const r = y / GAP;
          const wave =
            Math.sin(c * 0.28 + t * 0.9) * Math.cos(r * 0.31 - t * 0.7) +
            Math.sin((c + r) * 0.12 - t * 0.5);
          const twinkle = Math.sin(t * 2.2 + seeds[r * cols + c]) * 0.25;
          ctx.globalAlpha = Math.max(
            0.04,
            Math.min(0.6, 0.22 + wave * 0.18 + twinkle * 0.3),
          );
          ctx.fillRect(x + 3, y + 3, 1.6, 1.6);
        }
      }
      ctx.globalAlpha = 1;
    };

    resize();
    const observer = new ResizeObserver(() => {
      resize();
      if (still) draw(0);
    });
    observer.observe(canvas);

    if (still) {
      draw(0);
      return () => observer.disconnect();
    }

    let raf = 0;
    let last = 0;
    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      if (time - last < FRAME_MS) return;
      last = time;
      draw(time);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className='absolute inset-0 h-full w-full text-foreground'
    />
  );
};

const useSeconds = (since: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  const s = Math.max(0, (now - since) / 1000);
  return s < 60
    ? `${s.toFixed(1)}s`
    : `${Math.floor(s / 60)}m ${String(Math.floor(s % 60)).padStart(2, '0')}s`;
};

const overlay =
  'absolute z-10 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium shadow-xs backdrop-blur-sm';

/** The frame on its way: animated dots, Cancel, a live timer and the model. */
export const RenderingCard = ({
  ratios,
  startedAt,
  modelName,
  onCancel,
}: {
  ratios: string[];
  startedAt: number;
  modelName?: string;
  onCancel: () => Promise<void>;
}) => {
  const elapsed = useSeconds(startedAt);
  const [cancelling, setCancelling] = useState(false);

  return (
    <div className='flex flex-wrap items-start gap-3'>
      {ratios.map((ratio, index) => (
        <div
          key={ratio}
          className={cn(
            'relative overflow-hidden rounded-2xl border bg-secondary/60',
            frameClass(ratio),
          )}
        >
          <DotField />
          {index === 0 && (
            <button
              type='button'
              disabled={cancelling}
              onClick={async () => {
                setCancelling(true);
                try {
                  await onCancel();
                } finally {
                  setCancelling(false);
                }
              }}
              className={cn(
                overlay,
                'left-2.5 top-2.5 flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-70',
              )}
            >
              {cancelling ? (
                <Loader2 className='size-3 animate-spin' />
              ) : (
                <X className='size-3' />
              )}
              Cancel
            </button>
          )}
          <span
            className={cn(
              overlay,
              'right-2.5 top-2.5 tabular-nums text-muted-foreground',
            )}
          >
            {elapsed}
          </span>
          {modelName && (
            <span className={cn(overlay, 'bottom-2.5 left-2.5')}>
              {modelName}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
