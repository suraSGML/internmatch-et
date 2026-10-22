'use client';

import { useState, useTransition } from 'react';
import { BellPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createSavedSearch } from '@/lib/actions/discovery';

interface Props {
  filters: {
    q?: string;
    field?: string;
    city?: string;
    mode?: string;
    paid?: string;
    duration_min?: string;
    duration_max?: string;
    stipend_min?: string;
    stipend_max?: string;
    year_min?: string;
  };
}

export function SaveSearchButton({ filters }: Props) {
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();
  const hasFilters = Object.values(filters).some(Boolean);

  const save = () => {
    if (!name.trim()) {
      toast.error('Enter a name for this search.');
      return;
    }
    const normalized = {
      keyword: filters.q || undefined,
      field_id: filters.field || undefined,
      city: filters.city || undefined,
      work_mode: filters.mode || undefined,
      is_paid: filters.paid === undefined || filters.paid === '' ? undefined : filters.paid === 'true',
      duration_min: filters.duration_min ? Number(filters.duration_min) : undefined,
      duration_max: filters.duration_max ? Number(filters.duration_max) : undefined,
      stipend_min: filters.stipend_min ? Number(filters.stipend_min) : undefined,
      stipend_max: filters.stipend_max ? Number(filters.stipend_max) : undefined,
      required_year_min: filters.year_min ? Number(filters.year_min) : undefined,
    };

    startTransition(async () => {
      const result = await createSavedSearch(name, normalized);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setName('');
      toast.success('Search saved. Matching new listings will appear in your notifications.');
    });
  };

  if (!hasFilters) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center border-t pt-3">
      <label htmlFor="saved-search-name" className="sr-only">Saved search name</label>
      <input
        id="saved-search-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={60}
        placeholder="Name this search for alerts"
        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      />
      <Button type="button" size="sm" onClick={save} disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellPlus className="mr-2 h-4 w-4" />}
        Save search & alerts
      </Button>
    </div>
  );
}
