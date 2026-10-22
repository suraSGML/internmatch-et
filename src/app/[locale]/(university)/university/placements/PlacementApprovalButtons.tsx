'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { approvePlacement } from '@/lib/actions/university';

interface Props {
  placementId: string;
  status: string;
}

export function PlacementApprovalButtons({ placementId, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  const handle = (action: 'approve' | 'reject' | 'activate' | 'complete') => {
    if (action === 'reject' && !showReject) {
      setShowReject(true);
      return;
    }
    startTransition(async () => {
      const result = await approvePlacement({
        placement_id: placementId,
        action,
        reason: action === 'reject' ? reason : undefined,
      });
      if (result.error) toast.error(typeof result.error === 'string' ? result.error : 'Action failed');
      else toast.success({
        approve: 'Placement approved',
        reject: 'Placement rejected',
        activate: 'Placement marked as active',
        complete: 'Placement marked as completed',
      }[action]);
      setShowReject(false);
      if (!result.error) router.refresh();
    });
  };

  if (showReject) {
    return (
      <div className="flex flex-col gap-2 mt-2 w-56">
        <Input
          placeholder="Reason for rejection…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="text-xs h-8"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-7"
            onClick={() => setShowReject(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs h-7 bg-red-600 hover:bg-red-700 text-white"
            disabled={isPending || !reason.trim()}
            onClick={() => handle('reject')}
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm Reject'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {status === 'pending_approval' && (
        <>
          <Button
            size="sm"
            className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white gap-1"
            disabled={isPending}
            onClick={() => handle('approve')}
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 text-red-600 border-red-200 gap-1"
            disabled={isPending}
            onClick={() => handle('reject')}
          >
            <XCircle className="h-3 w-3" />
            Reject
          </Button>
        </>
      )}
      {status === 'approved' && (
        <Button
          size="sm"
          className="text-xs h-7 bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
          disabled={isPending}
          onClick={() => handle('activate')}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          Mark Active
        </Button>
      )}
      {status === 'active' && (
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7"
          disabled={isPending}
          onClick={() => handle('complete')}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          Mark Completed
        </Button>
      )}
    </div>
  );
}
