'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateApplicationStatus } from '@/lib/actions/applications';
import { ScheduleInterviewDialog } from '@/components/shared/ScheduleInterviewDialog';
import { SendOfferDialog } from '@/components/shared/SendOfferDialog';

const NEXT_STATUSES: Record<string, string[]> = {
  submitted:           ['under_review', 'shortlisted', 'rejected'],
  under_review:        ['shortlisted', 'rejected'],
  shortlisted:         ['rejected'],
  interview_scheduled: ['shortlisted', 'rejected'],
  offered:             ['rejected'],
  accepted:            [],
  rejected:            ['under_review'],
  declined:            [],
  withdrawn:           [],
};

const STATUS_LABELS: Record<string, string> = {
  under_review:        'Move to Review',
  shortlisted:         'Shortlist',
  rejected:            'Reject',
};

interface Props {
  applicationId: string;
  currentStatus: string;
  studentId?: string;
  locale?: string;
}

export function ApplicationStatusActions({ applicationId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextStatuses = NEXT_STATUSES[currentStatus] ?? [];
  const canScheduleInterview = currentStatus === 'shortlisted';
  const canSendOffer = ['shortlisted', 'interview_scheduled'].includes(currentStatus);

  if (nextStatuses.length === 0 && !canScheduleInterview && !canSendOffer) return null;

  const handleChange = (status: string) => {
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, status);
      if (result.error) toast.error(result.error as string);
      else {
        toast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
        router.refresh();
      }
    });
  };

  return (
    <>
      {nextStatuses.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-7 gap-1"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Move to
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {nextStatuses.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => handleChange(s)}
                className={s === 'rejected' ? 'text-red-500' : ''}
              >
                {STATUS_LABELS[s] ?? s.replace(/_/g, ' ')}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {canScheduleInterview && (
        <ScheduleInterviewDialog applicationId={applicationId} />
      )}
      {canSendOffer && (
        <SendOfferDialog applicationId={applicationId} />
      )}
    </>
  );
}
