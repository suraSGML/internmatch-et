'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { UserMinus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { removeTeamMember } from '@/lib/actions/company';

interface Props {
  memberId: string;
  memberName: string;
}

export function RemoveMemberButton({ memberId, memberName }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-gray-400 hover:text-red-500 h-7 px-2"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Remove ${memberName} from the team?`)) return;
        startTransition(async () => {
          const result = await removeTeamMember(memberId);
          if (result?.error) toast.error(result.error);
          else toast.success(`${memberName} removed from team`);
        });
      }}
    >
      {isPending
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <UserMinus className="h-3.5 w-3.5" />
      }
    </Button>
  );
}
