'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { reviewListingReport } from '@/lib/actions/discovery';

export function ListingReportReview({
  reportId,
  initialNote,
}: {
  reportId: string;
  initialNote: string | null;
}) {
  const [note, setNote] = useState(initialNote ?? '');
  const [isPending, startTransition] = useTransition();

  const review = (status: 'reviewed' | 'dismissed' | 'action_taken') => {
    startTransition(async () => {
      const result = await reviewListingReport(reportId, status, note);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Report review saved.');
      window.location.reload();
    });
  };

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <label htmlFor={`report-note-${reportId}`} className="text-xs font-medium text-gray-600">Admin note (optional)</label>
      <Textarea id={`report-note-${reportId}`} rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => review('reviewed')}>Mark reviewed</Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => review('dismissed')}>Dismiss</Button>
        <Button size="sm" disabled={isPending} onClick={() => review('action_taken')}>Close listing &amp; mark action taken</Button>
      </div>
    </div>
  );
}
