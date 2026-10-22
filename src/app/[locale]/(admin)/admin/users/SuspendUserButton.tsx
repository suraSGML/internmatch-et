'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, UserX, UserCheck } from 'lucide-react';
import { toggleUserSuspension } from '@/lib/actions/admin';

interface Props {
  userId: string;
  isSuspended: boolean;
}

export function SuspendUserButton({ userId, isSuspended }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await toggleUserSuspension(userId, !isSuspended);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(isSuspended ? 'User reactivated' : 'User suspended');
        router.refresh();
      }
    });
  };

  return (
    <Button
      size="sm"
      variant={isSuspended ? 'outline' : 'destructive'}
      className="text-xs h-7"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isSuspended ? (
        <><UserCheck className="h-3 w-3 mr-1" />Reactivate</>
      ) : (
        <><UserX className="h-3 w-3 mr-1" />Suspend</>
      )}
    </Button>
  );
}
