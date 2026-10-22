'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { verifyCompany } from '@/lib/actions/profile';

export function RejectCompanyForm({ companyId }: { companyId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error('Enter a reason so the company knows what to correct.');
      return;
    }

    startTransition(async () => {
      const result = await verifyCompany(companyId, 'reject', trimmedReason);
      if (result.error) {
        toast.error(`Failed: ${result.error}`);
        return;
      }
      toast.success('Company rejected with feedback');
    });
  };

  if (!isOpen) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => setIsOpen(true)}
      >
        <XCircle className="h-3 w-3 mr-1" />
        Reject
      </Button>
    );
  }

  return (
    <div className="w-72 space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <label htmlFor={`company-rejection-${companyId}`} className="text-xs font-medium text-red-900">
        Reason for rejection (required)
      </label>
      <Textarea
        id={`company-rejection-${companyId}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="For example: Registration documents were not submitted."
        maxLength={1000}
        rows={3}
        disabled={isPending}
      />
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setIsOpen(false);
            setReason('');
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button size="sm" variant="destructive" onClick={submit} disabled={isPending || !reason.trim()}>
          {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          Confirm rejection
        </Button>
      </div>
    </div>
  );
}
