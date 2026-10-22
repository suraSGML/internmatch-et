import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusVariant =
  | 'pending' | 'pending_approval' | 'verified' | 'rejected' | 'suspended'
  | 'submitted' | 'under_review' | 'shortlisted' | 'interview_scheduled'
  | 'offered' | 'accepted' | 'declined' | 'withdrawn'
  | 'open' | 'draft' | 'closed' | 'filled' | 'cancelled'
  | 'active' | 'completed' | 'terminated'
  | 'approved' | 'needs_revision';

const STATUS_STYLES: Record<StatusVariant, string> = {
  // Verification
  pending:             'bg-amber-100 text-amber-700 border-amber-200',
  pending_approval:    'bg-amber-100 text-amber-700 border-amber-200',
  verified:            'bg-green-100 text-green-700 border-green-200',
  rejected:            'bg-red-100 text-red-700 border-red-200',
  suspended:           'bg-red-100 text-red-700 border-red-200',
  // Applications
  submitted:           'bg-blue-100 text-blue-700 border-blue-200',
  under_review:        'bg-purple-100 text-purple-700 border-purple-200',
  shortlisted:         'bg-indigo-100 text-indigo-700 border-indigo-200',
  interview_scheduled: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  offered:             'bg-amber-100 text-amber-700 border-amber-200',
  accepted:            'bg-green-100 text-green-700 border-green-200',
  declined:            'bg-red-100 text-red-700 border-red-200',
  withdrawn:           'bg-gray-100 text-gray-600 border-gray-200',
  // Internships
  open:                'bg-green-100 text-green-700 border-green-200',
  draft:               'bg-gray-100 text-gray-600 border-gray-200',
  closed:              'bg-slate-100 text-slate-600 border-slate-200',
  filled:              'bg-blue-100 text-blue-700 border-blue-200',
  cancelled:           'bg-red-100 text-red-700 border-red-200',
  // Placements
  active:              'bg-green-100 text-green-700 border-green-200',
  completed:           'bg-blue-100 text-blue-700 border-blue-200',
  terminated:          'bg-red-100 text-red-700 border-red-200',
  // Logbook
  approved:            'bg-green-100 text-green-700 border-green-200',
  needs_revision:      'bg-orange-100 text-orange-700 border-orange-200',
};

const STATUS_LABELS: Record<string, string> = {
  under_review:        'Under Review',
  interview_scheduled: 'Interview Scheduled',
  needs_revision:      'Needs Revision',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status as StatusVariant] ?? 'bg-gray-100 text-gray-600';
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <Badge
      variant="outline"
      className={cn('font-medium capitalize', style, className)}
    >
      {label}
    </Badge>
  );
}
