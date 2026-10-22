'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteField } from '@/lib/actions/admin';

export function DeleteFieldButton({ fieldId, fieldName }: { fieldId: string; fieldName: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-gray-400 hover:text-red-500 shrink-0"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Delete field "${fieldName}"? This cannot be undone.`)) return;
        startTransition(async () => {
          const result = await deleteField(fieldId);
          if (result?.error) toast.error(result.error);
          else toast.success('Field deleted');
        });
      }}
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  );
}
