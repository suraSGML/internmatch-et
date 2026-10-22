'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { withdrawApplication } from '@/lib/actions/applications';

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleWithdraw = () => {
    if (!confirm('Withdraw this application? This cannot be undone.')) return;
    startTransition(async () => {
      const result = await withdrawApplication(applicationId);
      if (result.error) toast.error(result.error as string);
      else toast.success('Application withdrawn');
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-gray-400 hover:text-red-500 h-6 px-2"
      disabled={isPending}
      onClick={handleWithdraw}
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Withdraw'}
    </Button>
  );
}
