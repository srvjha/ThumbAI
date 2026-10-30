'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ChartTable {
  columns: string[];
  rows: (string | number)[][];
}

/**
 * Frame for every chart: title, a one-line read of the data, and a toggle to
 * the same numbers as a table so nothing is gated behind hover.
 */
export const ChartCard = ({
  title,
  description,
  legend,
  table,
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  legend?: ReactNode;
  table?: ChartTable;
  className?: string;
  children: ReactNode;
}) => {
  const [showTable, setShowTable] = useState(false);
  return (
    <section
      className={cn('min-w-0 rounded-xl border bg-card p-4 sm:p-5', className)}
    >
      <div className='mb-4 flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h2 className='text-sm font-medium'>{title}</h2>
          {description && (
            <p className='mt-0.5 text-xs text-muted-foreground'>
              {description}
            </p>
          )}
        </div>
        {table && (
          <button
            type='button'
            onClick={() => setShowTable((value) => !value)}
            aria-pressed={showTable}
            className='shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground'
          >
            {showTable ? 'Chart' : 'Table'}
          </button>
        )}
      </div>
      {legend && !showTable && <div className='mb-3'>{legend}</div>}
      {showTable && table ? (
        <div className='max-h-80 overflow-auto rounded-lg border'>
          <table className='w-full text-xs'>
            <thead className='sticky top-0 bg-secondary text-muted-foreground'>
              <tr>
                {table.columns.map((column, index) => (
                  <th
                    key={column}
                    className={cn(
                      'px-3 py-2 font-medium',
                      index === 0 ? 'text-left' : 'text-right',
                    )}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y'>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      className={cn(
                        'px-3 py-1.5',
                        index === 0
                          ? 'text-left'
                          : 'text-right font-mono tabular-nums',
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
};

/** Legend entry: a mark that mirrors the chart's (line or swatch) + text. */
export const LegendItem = ({
  color,
  label,
  value,
  mark = 'line',
}: {
  color: string;
  label: string;
  value?: ReactNode;
  mark?: 'line' | 'swatch';
}) => (
  <span className='inline-flex items-center gap-2 text-xs'>
    <span
      aria-hidden
      className={
        mark === 'line' ? 'h-0.5 w-4 rounded-full' : 'size-2.5 rounded-sm'
      }
      style={{ background: color }}
    />
    <span className='text-muted-foreground'>{label}</span>
    {value !== undefined && (
      <span className='font-mono tabular-nums text-foreground'>{value}</span>
    )}
  </span>
);
