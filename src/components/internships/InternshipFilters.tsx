'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InternshipFiltersProps {
  fields: Array<{ id: string; name_en: string }>;
}

export function InternshipFilters({ fields }: InternshipFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete('page'); // reset page on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearAll = () => {
    router.push(pathname);
  };

  const activeCount = ['q', 'field', 'city', 'mode', 'paid', 'duration_min', 'duration_max', 'stipend_min', 'stipend_max', 'year_min'].filter(
    (k) => searchParams.has(k)
  ).length;

  return (
    <div className="space-y-4">
      {/* Keyword search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search internships…"
          className="pl-9"
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val.length === 0 || val.length >= 2) setParam('q', val || null);
          }}
        />
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500">Active filters:</span>
          {searchParams.get('q') && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setParam('q', null)}>
              &ldquo;{searchParams.get('q')}&rdquo; <X className="h-3 w-3" />
            </Badge>
          )}
          {searchParams.get('field') && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setParam('field', null)}>
              {fields.find((f) => f.id === searchParams.get('field'))?.name_en ?? 'Field'}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {searchParams.get('city') && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setParam('city', null)}>
              {searchParams.get('city')} <X className="h-3 w-3" />
            </Badge>
          )}
          {searchParams.get('mode') && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setParam('mode', null)}>
              {searchParams.get('mode')} <X className="h-3 w-3" />
            </Badge>
          )}
          {searchParams.get('paid') && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setParam('paid', null)}>
              {searchParams.get('paid') === 'true' ? 'Paid only' : 'Unpaid only'} <X className="h-3 w-3" />
            </Badge>
          )}
          {(searchParams.get('duration_min') || searchParams.get('duration_max')) && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setParam('duration_min', null); setParam('duration_max', null); }}>
              {searchParams.get('duration_min') ?? 1}–{searchParams.get('duration_max') ?? 'any'} weeks <X className="h-3 w-3" />
            </Badge>
          )}
          {(searchParams.get('stipend_min') || searchParams.get('stipend_max')) && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('stipend_min');
              params.delete('stipend_max');
              params.delete('page');
              router.push(`${pathname}?${params.toString()}`);
            }}>
              ETB {searchParams.get('stipend_min') ?? 0}–{searchParams.get('stipend_max') ?? 'any'} <X className="h-3 w-3" />
            </Badge>
          )}
          {searchParams.get('year_min') && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setParam('year_min', null)}>
              Year {searchParams.get('year_min')}+ <X className="h-3 w-3" />
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-400" onClick={clearAll}>
            Clear all
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* Field */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Field</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={searchParams.get('field') ?? ''}
            onChange={(e) => setParam('field', e.target.value || null)}
          >
            <option value="">All fields</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>{f.name_en}</option>
            ))}
          </select>
        </div>

        {/* City */}
        <div>
          <label htmlFor="city-filter" className="text-xs font-medium text-gray-600 mb-1 block">City</label>
          <Input
            id="city-filter"
            defaultValue={searchParams.get('city') ?? ''}
            onBlur={(event) => setParam('city', event.target.value.trim() || null)}
            placeholder="Any city"
          />
        </div>

        {/* Work mode */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Mode</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={searchParams.get('mode') ?? ''}
            onChange={(e) => setParam('mode', e.target.value || null)}
          >
            <option value="">Any mode</option>
            <option value="on_site">On-site</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        {/* Pay */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Pay</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={searchParams.get('paid') ?? ''}
            onChange={(e) => setParam('paid', e.target.value || null)}
          >
            <option value="">Any</option>
            <option value="true">Paid only</option>
            <option value="false">Unpaid only</option>
          </select>
        </div>

        <div>
          <label htmlFor="duration-min" className="text-xs font-medium text-gray-600 mb-1 block">Minimum duration (weeks)</label>
          <Input
            id="duration-min"
            type="number"
            min={1}
            max={104}
            value={searchParams.get('duration_min') ?? ''}
            onChange={(event) => setParam('duration_min', event.target.value || null)}
            placeholder="Any"
          />
        </div>

        <div>
          <label htmlFor="duration-max" className="text-xs font-medium text-gray-600 mb-1 block">Maximum duration (weeks)</label>
          <Input
            id="duration-max"
            type="number"
            min={1}
            max={104}
            value={searchParams.get('duration_max') ?? ''}
            onChange={(event) => setParam('duration_max', event.target.value || null)}
            placeholder="Any"
          />
        </div>

        <div>
          <label htmlFor="stipend-min" className="text-xs font-medium text-gray-600 mb-1 block">Minimum stipend (ETB / month)</label>
          <Input
            id="stipend-min"
            type="number"
            min={0}
            value={searchParams.get('stipend_min') ?? ''}
            onChange={(event) => setParam('stipend_min', event.target.value || null)}
            placeholder="Any"
          />
        </div>

        <div>
          <label htmlFor="stipend-max" className="text-xs font-medium text-gray-600 mb-1 block">Maximum stipend (ETB / month)</label>
          <Input
            id="stipend-max"
            type="number"
            min={0}
            value={searchParams.get('stipend_max') ?? ''}
            onChange={(event) => setParam('stipend_max', event.target.value || null)}
            placeholder="Any"
          />
        </div>

        <div>
          <label htmlFor="year-min" className="text-xs font-medium text-gray-600 mb-1 block">Eligible study year</label>
          <select
            id="year-min"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={searchParams.get('year_min') ?? ''}
            onChange={(event) => setParam('year_min', event.target.value || null)}
          >
            <option value="">Any year</option>
            {[1, 2, 3, 4, 5, 6, 7].map((year) => <option key={year} value={year}>{year}+</option>)}
          </select>
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Sort by:</span>
        <div className="flex gap-2">
          {[
            { label: 'Newest', value: 'newest' },
            { label: 'Deadline', value: 'deadline' },
            { label: 'Stipend', value: 'stipend' },
          ].map(({ label, value }) => (
            <Button
              key={value}
              variant={searchParams.get('sort') === value || (!searchParams.get('sort') && value === 'newest') ? 'default' : 'outline'}
              size="sm"
              className={`text-xs h-7 ${searchParams.get('sort') === value || (!searchParams.get('sort') && value === 'newest') ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
              onClick={() => setParam('sort', value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
