'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { issuePlacementLetter } from '@/lib/actions/university';

export function IssuePlacementLetterButton({ placementId }: { placementId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleIssue = () => {
    startTransition(async () => {
      const result = await issuePlacementLetter({ placement_id: placementId });
      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Could not issue letter');
        return;
      }
      if ('existing' in result && result.existing) {
        toast.info('A letter already exists for this placement');
      } else {
        toast.success(`Letter issued — code: ${result.public_code}`);
      }
    });
  };

  return (
    <Button
      size="sm"
      onClick={handleIssue}
      disabled={isPending}
      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 text-xs"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <FileText className="h-3 w-3" />
      )}
      Issue Letter
    </Button>
  );
}
