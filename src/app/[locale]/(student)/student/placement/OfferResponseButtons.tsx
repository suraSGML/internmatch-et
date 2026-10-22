'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { respondToOffer } from '@/lib/actions/interviews';

interface Props {
  offerId: string;
}

export function OfferResponseButtons({ offerId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handle = (response: 'accepted' | 'declined') => {
    const confirmMsg =
      response === 'accepted'
        ? 'Accept this offer? The placement will be sent to your university coordinator for approval.'
        : 'Decline this offer? This cannot be undone.';
    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      const result = await respondToOffer(offerId, response);
      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'An error occurred');
      } else {
        toast.success(response === 'accepted'
          ? 'Offer accepted. Your placement is awaiting university approval.'
          : 'Offer declined.');
        router.refresh();
      }
    });
  };

  return (
    <div className="flex gap-3">
      <Button
        onClick={() => handle('accepted')}
        disabled={isPending}
        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Accept Offer
      </Button>
      <Button
        onClick={() => handle('declined')}
        disabled={isPending}
        variant="outline"
        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-2"
      >
        <XCircle className="h-4 w-4" />
        Decline
      </Button>
    </div>
  );
}
