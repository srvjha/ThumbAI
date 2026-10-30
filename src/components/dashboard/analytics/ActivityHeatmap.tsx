'use client';

import { useState } from 'react';
import { useElementWidth } from '../useElementWidth';
import { ChartTooltip, TooltipRow } from './ChartTooltip';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES = [
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
  'Sundays',
];
const LABEL_WIDTH = 32;
const GAP = 2;
// Sequential: one hue, light to dark, mixed into the card surface.
const STEPS = [22, 42, 62, 82, 100];
const stepColor = (step: number) =>
  `color-mix(in oklab, var(--chart-1) ${STEPS[step]}%, var(--card))`;

export const formatHour = (hour: number) =>
  `${hour % 12 || 12} ${hour < 12 ? 'am' : 'pm'}`;

/** Peak weekday and hour, for the card's one-line summary. */
export const peakActivity = (heatmap: number[][]) => {
  const byDay = heatmap.map((row) => row.reduce((a, b) => a + b, 0));
  const byHour = Array.from({ length: 24 }, (_, hour) =>
    heatmap.reduce((sum, row) => sum + row[hour], 0),
  );
  const total = byDay.reduce((a, b) => a + b, 0);
  if (!total) return null;
  return {
    day: DAY_NAMES[byDay.indexOf(Math.max(...byDay))],
    hour: formatHour(byHour.indexOf(Math.max(...byHour))),
  };
};

/** Weekday × hour grid of generation counts, in the viewer's local time. */
export const ActivityHeatmap = ({ heatmap }: { heatmap: number[][] }) => {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ day: number; hour: number } | null>(
    null,
  );
  const cell = Math.max(6, Math.floor((width - LABEL_WIDTH) / 24) - GAP);
  const pitch = cell + GAP;
  const height = 7 * pitch + 18;
  const max = Math.max(0, ...heatmap.flat());
  const stepOf = (value: number) =>
    Math.min(STEPS.length - 1, Math.floor((value / max) * STEPS.length - 1e-9));

  const hoveredValue = hover ? heatmap[hover.day][hover.hour] : 0;

  return (
    <div>
      <div ref={ref} className='relative'>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            className='block select-none'
            role='img'
            aria-label='Generations by weekday and hour. Switch to the table for exact counts.'
            onPointerMove={(event) => {
              // Hit-test by pitch so the gaps between cells still count.
              const box = event.currentTarget.getBoundingClientRect();
              const hour = Math.floor(
                (event.clientX - box.left - LABEL_WIDTH) / pitch,
              );
              const day = Math.floor((event.clientY - box.top) / pitch);
              setHover(
                hour >= 0 && hour < 24 && day >= 0 && day < 7
                  ? { day, hour }
                  : null,
              );
            }}
            onPointerLeave={() => setHover(null)}
          >
            {DAYS.map((day, dayIndex) => (
              <text
                key={day}
                x={0}
                y={dayIndex * pitch + cell / 2}
                dy='0.32em'
                className='fill-muted-foreground text-[11px]'
              >
                {day}
              </text>
            ))}
            {heatmap.map((row, dayIndex) =>
              row.map((value, hour) => (
                <rect
                  key={`${dayIndex}-${hour}`}
                  x={LABEL_WIDTH + hour * pitch}
                  y={dayIndex * pitch}
                  width={cell}
                  height={cell}
                  rx={2}
                  fill={value ? stepColor(stepOf(value)) : 'var(--secondary)'}
                  stroke={
                    hover?.day === dayIndex && hover.hour === hour
                      ? 'var(--foreground)'
                      : 'none'
                  }
                  strokeWidth={1.5}
                />
              )),
            )}
            {[0, 6, 12, 18].map((hour) => (
              <text
                key={hour}
                x={LABEL_WIDTH + hour * pitch}
                y={height - 4}
                className='fill-muted-foreground text-[11px]'
              >
                {formatHour(hour)}
              </text>
            ))}
          </svg>
        )}
        {hover && (
          <ChartTooltip
            x={LABEL_WIDTH + hover.hour * pitch + cell / 2}
            y={hover.day * pitch + cell + 4}
            containerWidth={width}
          >
            <TooltipRow
              value={hoveredValue}
              label={hoveredValue === 1 ? 'generation' : 'generations'}
            />
            <p className='text-muted-foreground'>
              {DAY_NAMES[hover.day]}, {formatHour(hover.hour)}
            </p>
          </ChartTooltip>
        )}
      </div>
      <div className='mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground'>
        Less
        <span className='size-2.5 rounded-sm bg-secondary' />
        {STEPS.map((_, step) => (
          <span
            key={step}
            className='size-2.5 rounded-sm'
            style={{ background: stepColor(step) }}
          />
        ))}
        More
      </div>
    </div>
  );
};

export const heatmapTable = (heatmap: number[][]) => ({
  columns: ['Hour', ...DAYS],
  rows: Array.from({ length: 24 }, (_, hour) => [
    formatHour(hour),
    ...heatmap.map((row) => row[hour]),
  ]),
});
