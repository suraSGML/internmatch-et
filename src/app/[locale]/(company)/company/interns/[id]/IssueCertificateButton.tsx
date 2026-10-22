'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { issueCertificate } from '@/lib/actions/logbook';

interface Props {
  placementId: string;
  disabled?: boolean;
}

export function IssueCertificateButton({ placementId, disabled }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleIssue = () => {
    if (!confirm('Issue a completion certificate for this intern? This cannot be undone.')) return;
    startTransition(async () => {
      const result = await issueCertificate({ placement_id: placementId });
      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Could not issue certificate');
        return;
      }
      if ('existing' in result && result.existing) {
        toast.info(`Certificate already exists — code: ${result.public_code}`);
      } else {
        toast.success(`Certificate issued! Code: ${result.public_code}`);
      }
    });
  };

  return (
    <Button
      onClick={handleIssue}
      disabled={isPending || disabled}
      className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Award className="h-4 w-4" />
      )}
      Issue Completion Certificate
    </Button>
  );
}
