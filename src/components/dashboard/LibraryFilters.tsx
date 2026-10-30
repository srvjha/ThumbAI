'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GenerationFilters, StatusFilter, Workflow } from './types';

const ALL = 'all';

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) => (
  <Select
    value={value ?? ALL}
    onValueChange={(next) => onChange(next === ALL ? undefined : next)}
  >
    <SelectTrigger
      aria-label={label}
      className='w-full min-w-0 bg-card sm:w-40'
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL}>{label}</SelectItem>
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

/** Search plus workflow / status / aspect filters, in one row above the grid. */
export const LibraryFilters = ({
  filters,
  onChange,
}: {
  filters: GenerationFilters;
  onChange: (filters: GenerationFilters) => void;
}) => {
  const [query, setQuery] = useState(filters.q ?? '');

  // Debounce typing so every keystroke isn't a request.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === (filters.q ?? '')) return;
    const timer = setTimeout(
      () => onChange({ ...filters, q: trimmed || undefined }),
      300,
    );
    return () => clearTimeout(timer);
  }, [query, filters, onChange]);

  // Follow external resets (e.g. "Clear filters").
  useEffect(() => {
    if (!filters.q) setQuery('');
  }, [filters.q]);

  return (
    <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'>
      <div className='relative sm:w-72'>
        <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          type='search'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Search prompts'
          aria-label='Search prompts'
          className='bg-card pl-9 pr-9'
        />
        {query && (
          <button
            type='button'
            aria-label='Clear search'
            onClick={() => setQuery('')}
            className='absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground'
          >
            <X className='size-3.5' />
          </button>
        )}
      </div>
      <div className='grid grid-cols-3 gap-2 sm:flex'>
        <FilterSelect
          label='All workflows'
          value={filters.workflow}
          onChange={(workflow) =>
            onChange({ ...filters, workflow: workflow as Workflow | undefined })
          }
          options={[
            { value: 'TEXT_TO_IMAGE', label: 'Text to image' },
            { value: 'IMAGE_TO_IMAGE', label: 'Image to image' },
            { value: 'URL_TO_IMAGE', label: 'Blog cover' },
          ]}
        />
        <FilterSelect
          label='Any status'
          value={filters.status}
          onChange={(status) =>
            onChange({ ...filters, status: status as StatusFilter | undefined })
          }
          options={[
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'PENDING', label: 'In progress' },
            { value: 'FAILED', label: 'Failed' },
          ]}
        />
        <FilterSelect
          label='Any size'
          value={filters.aspect_ratio}
          onChange={(aspect_ratio) => onChange({ ...filters, aspect_ratio })}
          options={[
            { value: '16:9', label: '16:9 thumbnail' },
            { value: '9:16', label: '9:16 Shorts' },
          ]}
        />
      </div>
    </div>
  );
};
