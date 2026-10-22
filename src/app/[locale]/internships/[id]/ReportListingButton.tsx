'use client';

import { useState, useTransition } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { reportInternship } from '@/lib/actions/discovery';

export function ReportListingButton({ internshipId }: { internshipId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await reportInternship(internshipId, reason);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Thanks. Our team will review this internship listing.');
      setReason('');
      setOpen(false);
    });
  };

  return (
    <div className="border-t pt-3">
      {!open ? (
        <Button variant="ghost" size="sm" className="h-auto px-0 text-xs text-gray-500" onClick={() => setOpen(true)}>
          <Flag className="mr-1.5 h-3.5 w-3.5" /> Report this listing
        </Button>
      ) : (
        <div className="space-y-2">
          <label htmlFor="listing-report-reason" className="text-xs font-medium text-gray-700">
            Tell us what seems wrong (10–1000 characters)
          </label>
          <Textarea
            id="listing-report-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="For example, the listing may be misleading or the deadline is incorrect."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={isPending || reason.trim().length < 10}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
