'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { sendOffer } from '@/lib/actions/interviews';

const schema = z.object({
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().optional(),
  terms: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  applicationId: string;
  applicantName?: string;
}

export function SendOfferDialog({ applicationId, applicantName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = await sendOffer({ application_id: applicationId, ...data });
      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Could not send offer');
        return;
      }
      if (result.warning) toast.warning(result.warning);
      else toast.success('Offer sent. The student application is now marked Offered.');
      reset();
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1 text-xs bg-indigo-600 hover:bg-indigo-700">
          <Send className="h-3 w-3" /> Send Offer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Internship Offer</DialogTitle>
          {applicantName && <p className="text-sm text-gray-500">to {applicantName}</p>}
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input id="start_date" type="date" {...register('start_date')} />
              {errors.start_date && <p className="text-xs text-red-500">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">End Date</Label>
              <Input id="end_date" type="date" {...register('end_date')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="terms">Terms & Conditions</Label>
            <textarea
              id="terms"
              rows={4}
              placeholder="Working hours, stipend details, expectations…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              {...register('terms')}
            />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
            ⚠️ You must not request any payment from the intern. Violations result in account suspension.
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Send Offer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
