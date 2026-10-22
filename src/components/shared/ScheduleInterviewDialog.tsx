'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { scheduleInterview } from '@/lib/actions/interviews';

const schema = z.object({
  scheduled_at: z.string().min(1, 'Date and time required'),
  mode: z.enum(['in_person', 'online', 'phone']),
  location_or_link: z.string().trim().min(1, 'Provide the interview details'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  applicationId: string;
  applicantName?: string;
}

export function ScheduleInterviewDialog({ applicationId, applicantName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { mode: 'in_person' },
  });

  const mode = watch('mode');

  const onSubmit = (data: FormData) => {
    const scheduledAt = new Date(`${data.scheduled_at}:00+03:00`);
    if (scheduledAt <= new Date()) {
      toast.error('Choose a future interview date and time.');
      return;
    }

    startTransition(async () => {
      const result = await scheduleInterview({
        application_id: applicationId,
        ...data,
        scheduled_at: scheduledAt.toISOString(),
      });
      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Could not schedule interview');
        return;
      }
      if (result.notificationWarning) {
        toast.warning(result.notificationWarning);
      } else {
        toast.success('Interview scheduled. The student has been notified.');
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 text-xs">
          <Calendar className="h-3 w-3" /> Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          {applicantName && (
            <p className="text-sm text-gray-500">for {applicantName}</p>
          )}
          <p className="text-xs text-gray-500">
            Set the date and time in East Africa Time (EAT, UTC+3). The student will see these details under Student Dashboard → Interviews.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_at">Date & Time *</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              required
              {...register('scheduled_at')}
            />
            {errors.scheduled_at && (
              <p className="text-xs text-red-500">{errors.scheduled_at.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mode">Interview Mode</Label>
            <select
              id="mode"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('mode')}
            >
              <option value="in_person">In Person</option>
              <option value="online">Online (Video Call)</option>
              <option value="phone">Phone</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location_or_link">
              {mode === 'in_person' ? 'Location' : mode === 'online' ? 'Meeting Link' : 'Phone Number'}
            </Label>
            <Input
              id="location_or_link"
              required
              placeholder={
                mode === 'in_person' ? 'Office address or room' :
                mode === 'online' ? 'https://meet.google.com/...' :
                '+251 9XX XXX XXX'
              }
              {...register('location_or_link')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              rows={2}
              placeholder="Any preparation notes for the candidate…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              {...register('notes')}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Schedule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
