'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ProfileCompletenessProps {
  percentage: number;
  className?: string;
  showLabel?: boolean;
  missingItems?: string[];
}

export function ProfileCompleteness({
  percentage,
  className,
  showLabel = true,
  missingItems = [],
}: ProfileCompletenessProps) {
  const color =
    percentage >= 80
      ? 'text-green-600'
      : percentage >= 50
      ? 'text-amber-600'
      : 'text-red-500';

  const label =
    percentage >= 80
      ? 'Profile looks great!'
      : percentage >= 50
      ? 'Profile is coming along'
      : 'Complete your profile to get noticed';

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        {showLabel && (
          <span className="font-medium text-gray-700">Profile Completeness</span>
        )}
        <span className={cn('font-bold', color)}>{percentage}%</span>
      </div>

      <Progress value={percentage} className="h-2" />

      {showLabel && (
        <div className={cn('flex items-center gap-1.5 text-xs', color)}>
          {percentage >= 80 ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{label}</span>
        </div>
      )}

      {missingItems.length > 0 && (
        <ul className="mt-2 space-y-1">
          {missingItems.map((item) => (
            <li key={item} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
