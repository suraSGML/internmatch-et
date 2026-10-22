'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Ban, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyCompany } from '@/lib/actions/profile';
import { toggleCompanySuspension } from '@/lib/actions/admin';
import { RejectCompanyForm } from './RejectCompanyForm';

interface Props {
  companyId: string;
  currentStatus: string;
}

export function VerifyCompanyActions({ companyId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (action: 'verify' | 'reject') => {
    startTransition(async () => {
      const result = await verifyCompany(companyId, action);
      if (result.error) {
        toast.error(`Failed: ${result.error}`);
      } else {
        toast.success(action === 'verify' ? 'Company verified' : 'Company rejected');
      }
    });
  };

  const handleSuspension = (suspend: boolean) => {
    startTransition(async () => {
      const result = await toggleCompanySuspension(companyId, suspend);
      if (result.error) {
        toast.error(`Failed: ${result.error}`);
      } else {
        toast.success(suspend ? 'Company suspended' : 'Company reactivated');
      }
    });
  };

  if (currentStatus === 'verified') {
    return (
      <Button
        size="sm"
        variant="destructive"
        disabled={isPending}
        onClick={() => handleSuspension(true)}
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3 mr-1" />}
        Suspend
      </Button>
    );
  }

  if (currentStatus === 'suspended') {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => handleSuspension(false)}
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-1" />}
        Reactivate
      </Button>
    );
  }

  if (currentStatus === 'pending') {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={isPending}
          onClick={() => handleAction('verify')}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
          Verify
        </Button>
        <RejectCompanyForm companyId={companyId} />
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => handleAction('verify')}
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      Re-verify
    </Button>
  );
}
