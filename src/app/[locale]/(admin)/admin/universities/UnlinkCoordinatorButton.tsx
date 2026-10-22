'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Unlink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unlinkCoordinator } from '@/lib/actions/admin';

interface Props {
  memberId: string;
  coordinatorName: string;
}

export function UnlinkCoordinatorButton({ memberId, coordinatorName }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-gray-400 hover:text-red-500 h-6 px-1.5 gap-1"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Unlink ${coordinatorName} from this university?`)) return;
        startTransition(async () => {
          const result = await unlinkCoordinator(memberId);
          if (result?.error) toast.error(result.error);
          else toast.success(`${coordinatorName} unlinked`);
        });
      }}
    >
      {isPending
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : <Unlink className="h-3 w-3" />
      }
      Unlink
    </Button>
  );
}
