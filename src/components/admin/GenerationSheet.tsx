'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  CircleDot,
  Coins,
  Copy,
  Inbox,
  Loader,
  RotateCcw,
  Send,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAdminGeneration } from '@/hooks/admin';
import { cn } from '@/lib/utils';
import { categoryLabel, dateTime, duration, fmt, WORKFLOWS } from './format';
import { GenStatus, Pill, SeverityBadge } from './ui';

const EVENTS: Record<
  string,
  { label: string; icon: LucideIcon; tone?: string }
> = {
  CREATED: { label: 'Request recorded', icon: CircleDot },
  CHARGED: { label: 'Credits charged', icon: Coins },
  SUBMITTED: { label: 'Queued at provider', icon: Send },
  SUBMIT_FAILED: {
    label: 'Provider refused',
    icon: X,
    tone: 'text-destructive',
  },
  IN_PROGRESS: { label: 'Rendering', icon: Loader },
  WEBHOOK_RECEIVED: { label: 'Webhook received', icon: Inbox },
  COMPLETED: {
    label: 'Images stored',
    icon: Check,
    tone: 'text-emerald-600 dark:text-emerald-400',
  },
  FAILED: {
    label: 'Marked failed',
    icon: AlertTriangle,
    tone: 'text-destructive',
  },
  REFUNDED: { label: 'Credits refunded', icon: RotateCcw },
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className='min-w-0'>
    <dt className='text-xs text-muted-foreground'>{label}</dt>
    <dd className='mt-0.5 truncate text-sm'>{children}</dd>
  </div>
);

const Mono = ({ value }: { value: string | null | undefined }) =>
  value ? (
    <button
      type='button'
      title='Copy'
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast.success('Copied');
      }}
      className='inline-flex max-w-full items-center gap-1 font-mono text-xs hover:text-foreground'
    >
      <span className='truncate'>{value}</span>
      <Copy className='size-3 shrink-0 text-muted-foreground' />
    </button>
  ) : (
    <span className='text-muted-foreground'>—</span>
  );

const detailText = (detail: unknown) => {
  if (!detail || typeof detail !== 'object') return null;
  return Object.entries(detail as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) =>
      /ms$/i.test(k) && typeof v === 'number'
        ? `${k.replace(/Ms$/, '')} ${duration(v)}`
        : `${k} ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`,
    )
    .join(' · ');
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className='border-t px-5 py-4'>
    <h3 className='mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
      {title}
    </h3>
    {children}
  </section>
);

/** Everything about one generation: settings, timeline, money, flags. */
export const GenerationSheet = ({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) => {
  const { data: g, isLoading } = useAdminGeneration(id);
  const start = g ? Date.parse(g.createdAt) : 0;

  return (
    <Sheet open={!!id} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='w-full gap-0 overflow-y-auto p-0 sm:max-w-xl'>
        <SheetHeader className='px-5 pt-5 pb-4'>
          <SheetTitle className='flex items-center gap-2'>
            Generation {g && <GenStatus status={g.status} />}
          </SheetTitle>
          <SheetDescription>
            {g ? dateTime(g.createdAt) : 'Loading…'}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !g ? (
          <div className='space-y-3 px-5'>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className='h-5 animate-pulse rounded bg-accent' />
            ))}
          </div>
        ) : (
          <>
            {g.imageUrls.length > 0 && (
              <div className='grid grid-cols-2 gap-2 px-5 pb-4'>
                {g.imageUrls.map((url) => (
                  <a key={url} href={url} target='_blank' rel='noreferrer'>
                    <img
                      src={url}
                      alt=''
                      className='aspect-video w-full rounded-lg border object-cover'
                    />
                  </a>
                ))}
              </div>
            )}

            {g.error && (
              <div className='mx-5 mb-4 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
                <AlertTriangle className='mt-0.5 size-4 shrink-0' />
                <span className='break-words'>{g.error}</span>
              </div>
            )}

            <Section title='Request'>
              <dl className='grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3'>
                <Field label='User'>
                  <Link
                    href={`/admin/users/${g.user.id}`}
                    className='hover:underline'
                  >
                    {g.user.email}
                  </Link>
                </Field>
                <Field label='Workflow'>
                  {WORKFLOWS[g.workflow ?? 'UNKNOWN']}
                </Field>
                <Field label='Tier'>
                  <span className='capitalize'>
                    {g.tier?.toLowerCase() ?? 'Edit model'}
                  </span>
                </Field>
                <Field label='Images'>{fmt(g.images)}</Field>
                <Field label='Aspect ratio'>{g.aspectRatio ?? '—'}</Field>
                <Field label='Format'>{g.format ?? '—'}</Field>
                <Field label='Seed'>
                  <span className='font-mono text-xs'>{g.seed ?? '—'}</span>
                </Field>
                <Field label='End to end'>{duration(g.latencyMs)}</Field>
                <Field label='Prompt size'>
                  {fmt(g.promptChars)} → {fmt(g.enhancedPromptChars)} chars
                </Field>
                <div className='col-span-2 sm:col-span-3'>
                  <Field label='Endpoint'>
                    <Mono value={g.endpoint} />
                  </Field>
                </div>
                <div className='col-span-2 sm:col-span-3 grid gap-3 sm:grid-cols-2'>
                  <Field label='Generation id'>
                    <Mono value={g.id} />
                  </Field>
                  <Field label='Provider request id'>
                    <Mono value={g.requestId} />
                  </Field>
                </div>
              </dl>
            </Section>

            <Section title='Timeline'>
              {g.events.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  No steps recorded. Generations from before step logging only
                  have their start and end times.
                </p>
              ) : (
                <ol className='relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[9px] before:w-px before:bg-border'>
                  {g.events.map((e) => {
                    const meta = EVENTS[e.type] ?? {
                      label: e.type,
                      icon: Sparkles,
                    };
                    const Icon = meta.icon;
                    const text = detailText(e.detail);
                    return (
                      <li key={e.id} className='relative flex gap-3'>
                        <span
                          className={cn(
                            'relative z-10 grid size-5 shrink-0 place-items-center rounded-full border bg-card',
                            meta.tone,
                          )}
                        >
                          <Icon className='size-3' />
                        </span>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-baseline justify-between gap-2'>
                            <span
                              className={cn('text-sm font-medium', meta.tone)}
                            >
                              {meta.label}
                            </span>
                            <span className='shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums'>
                              +{duration(Date.parse(e.createdAt) - start)}
                            </span>
                          </div>
                          {text && (
                            <p className='mt-0.5 font-mono text-[11px] break-words text-muted-foreground'>
                              {text}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Section>

            <Section title='Credits'>
              {g.ledger.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  No ledger entries.
                </p>
              ) : (
                <ul className='space-y-2 text-sm'>
                  {g.ledger.map((t) => (
                    <li
                      key={t.id}
                      className='flex items-center justify-between gap-3'
                    >
                      <span className='capitalize'>
                        {t.type.replace('GENERATION_', '').toLowerCase()}
                      </span>
                      <span className='font-mono text-xs tabular-nums'>
                        <span
                          className={
                            t.amount < 0
                              ? 'text-destructive'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }
                        >
                          {t.amount > 0 ? '+' : ''}
                          {t.amount}
                        </span>
                        <span className='text-muted-foreground'>
                          {' '}
                          → {t.balanceAfter}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title='Prompt screening'>
              {g.flags.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  Nothing flagged. The prompt itself is never shown here.
                </p>
              ) : (
                <ul className='space-y-2'>
                  {g.flags.map((f) => (
                    <li
                      key={f.id}
                      className='flex flex-wrap items-center gap-1.5'
                    >
                      <SeverityBadge severity={f.severity} />
                      {f.categories.map((c) => (
                        <Pill key={c}>{categoryLabel(c)}</Pill>
                      ))}
                      {f.score != null && (
                        <span className='font-mono text-[11px] text-muted-foreground'>
                          score {f.score.toFixed(2)}
                        </span>
                      )}
                      {f.resolvedAt && (
                        <span className='text-[11px] text-muted-foreground'>
                          · reviewed
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
