'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reviewUniversityRegistrationRequest } from '@/lib/actions/admin';

interface Props {
  requestId: string;
}

export function UniversityRegistrationRequestActions({ requestId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const review = (decision: 'approve' | 'reject') => {
    startTransition(async () => {
      const result = await reviewUniversityRegistrationRequest(requestId, decision);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(decision === 'approve'
        ? 'University access approved and coordinator linked'
        : 'University request rejected');
      router.refresh();
    });
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={isPending}
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => review('approve')}
      >
        {isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        className="text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => review('reject')}
      >
        <XCircle className="mr-1 h-3.5 w-3.5" />
        Decline
      </Button>
    </div>
  );
}
