'use client';

import { useState, useTransition } from 'react';
import { Bell, BellOff, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { updateSavedSearchAlert, deleteSavedSearch } from '@/lib/actions/discovery';

interface SearchRow {
  id: string;
  name: string;
  filters: Record<string, string | number | boolean | null>;
  alert_on: boolean;
  created_at: string;
}

function describeFilters(filters: SearchRow['filters']) {
  const labels: string[] = [];
  if (filters.keyword) labels.push(`“${filters.keyword}”`);
  if (filters.city) labels.push(String(filters.city));
  if (filters.work_mode) labels.push(String(filters.work_mode).replace('_', ' '));
  if (filters.is_paid === true) labels.push('Paid');
  if (filters.is_paid === false) labels.push('Unpaid');
  if (filters.duration_min || filters.duration_max) {
    labels.push(`${filters.duration_min ?? 1}–${filters.duration_max ?? 'any'} weeks`);
  }
  if (filters.stipend_min || filters.stipend_max) {
    labels.push(`ETB ${filters.stipend_min ?? 0}–${filters.stipend_max ?? 'any'} / month`);
  }
  if (filters.required_year_min) labels.push(`Year ${filters.required_year_min}+`);
  return labels.join(' · ') || 'All internships';
}

export function SavedSearchManager({ searches, locale }: { searches: SearchRow[]; locale: string }) {
  const [items, setItems] = useState(searches);
  const [isPending, startTransition] = useTransition();

  const toggle = (search: SearchRow) => {
    startTransition(async () => {
      const result = await updateSavedSearchAlert(search.id, !search.alert_on);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setItems((current) => current.map((item) =>
        item.id === search.id ? { ...item, alert_on: !item.alert_on } : item
      ));
      toast.success(search.alert_on ? 'Alerts paused.' : 'Alerts enabled.');
    });
  };

  const remove = (search: SearchRow) => {
    if (!confirm(`Delete saved search “${search.name}”?`)) return;
    startTransition(async () => {
      const result = await deleteSavedSearch(search.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setItems((current) => current.filter((item) => item.id !== search.id));
      toast.success('Saved search deleted.');
    });
  };

  return (
    <div className="space-y-3">
      {items.map((search) => (
        <div key={search.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-white p-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900">{search.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{describeFilters(search.filters)}</p>
            <p className="mt-1 text-xs text-gray-400">
              {search.alert_on ? 'In-app alerts on for new matching listings' : 'Alerts paused'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/${locale}/internships?${new URLSearchParams({
                ...(typeof search.filters.keyword === 'string' ? { q: search.filters.keyword } : {}),
                ...(typeof search.filters.field_id === 'string' ? { field: search.filters.field_id } : {}),
                ...(typeof search.filters.city === 'string' ? { city: search.filters.city } : {}),
                ...(typeof search.filters.work_mode === 'string' ? { mode: search.filters.work_mode } : {}),
                ...(typeof search.filters.is_paid === 'boolean' ? { paid: String(search.filters.is_paid) } : {}),
                ...(typeof search.filters.duration_min === 'number' ? { duration_min: String(search.filters.duration_min) } : {}),
                ...(typeof search.filters.duration_max === 'number' ? { duration_max: String(search.filters.duration_max) } : {}),
                ...(typeof search.filters.stipend_min === 'number' ? { stipend_min: String(search.filters.stipend_min) } : {}),
                ...(typeof search.filters.stipend_max === 'number' ? { stipend_max: String(search.filters.stipend_max) } : {}),
                ...(typeof search.filters.required_year_min === 'number' ? { year_min: String(search.filters.required_year_min) } : {}),
              }).toString()}`}>View results</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => toggle(search)} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : search.alert_on ? <BellOff className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
              {search.alert_on ? 'Pause alerts' : 'Enable alerts'}
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Delete ${search.name}`} onClick={() => remove(search)} disabled={isPending}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </div>
      ))}
      {!items.length && <p className="rounded-lg bg-white p-8 text-center text-sm text-gray-500">No saved searches yet. Save filters from the internship browser to get notified about new matches.</p>}
    </div>
  );
}
