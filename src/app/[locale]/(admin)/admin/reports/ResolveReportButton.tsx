'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateReportStatus } from '@/lib/actions/admin';

interface Props {
  reportId: string;
  currentStatus: string;
}

export function ResolveReportButton({ reportId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();

  if (currentStatus === 'resolved' || currentStatus === 'dismissed') return null;

  const handleUpdate = (status: 'investigating' | 'resolved' | 'dismissed') => {
    startTransition(async () => {
      const result = await updateReportStatus(reportId, status);
      if (result?.error) toast.error(result.error);
      else toast.success(`Report marked as ${status}`);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-7 gap-1" disabled={isPending}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Update'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {currentStatus === 'open' && (
          <DropdownMenuItem onClick={() => handleUpdate('investigating')} className="gap-2">
            <Search className="h-3.5 w-3.5 text-amber-500" /> Investigating
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => handleUpdate('resolved')} className="gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Resolve
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleUpdate('dismissed')} className="gap-2 text-gray-400">
          <XCircle className="h-3.5 w-3.5" /> Dismiss
        </DropdownMenuItem>      </DropdownMenuContent>
    </DropdownMenu>
  );
}
