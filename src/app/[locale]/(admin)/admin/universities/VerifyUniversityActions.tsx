'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyUniversity } from '@/lib/actions/profile';

interface Props {
  universityId: string;
  currentStatus: string;
}

export function VerifyUniversityActions({ universityId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (action: 'verify' | 'reject') => {
    startTransition(async () => {
      const result = await verifyUniversity(universityId, action);
      if (result.error) toast.error(`Failed: ${result.error}`);
      else toast.success(action === 'verify' ? 'University verified' : 'University rejected');
    });
  };

  if (currentStatus === 'verified') {
    return (
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 border-red-200 hover:bg-red-50"
        disabled={isPending}
        onClick={() => handleAction('reject')}
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
        Suspend
      </Button>
    );
  }

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
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 border-red-200 hover:bg-red-50"
        disabled={isPending}
        onClick={() => handleAction('reject')}
      >
        <XCircle className="h-3 w-3 mr-1" />
        Reject
      </Button>
    </div>
  );
}
