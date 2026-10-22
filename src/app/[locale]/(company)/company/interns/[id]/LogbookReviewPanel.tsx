'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Loader2, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { supervisorReviewEntry } from '@/lib/actions/logbook';

interface LogbookEntry {
  id: string;
  week_start: string;
  week_end: string;
  tasks: string;
  skills_practiced?: string | null;
  challenges?: string | null;
  hours: number;
  status: string;
  supervisor_comment?: string | null;
}

export function LogbookReviewPanel({ entries }: { entries: LogbookEntry[] }) {
  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleReview = (entryId: string, action: 'approved' | 'needs_revision') => {
    startTransition(async () => {
      const result = await supervisorReviewEntry({
        entry_id: entryId,
        action,
        comment: comments[entryId] || undefined,
      });
      if (result.error) toast.error('Review failed');
      else toast.success(action === 'approved' ? 'Entry approved' : 'Revision requested');
    });
  };

  if (entries.length === 0) {
    return (
      <Card className="border-0 shadow-sm mt-2">
        <CardContent className="py-8 text-center text-gray-400 text-sm">
          No logbook entries yet. The intern has not submitted any weekly entries.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      {entries.map((entry) => (
        <Card key={entry.id} className="border-0 shadow-sm">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-start justify-between gap-3">
              <button
                className="flex-1 text-left"
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    Week of {new Date(entry.week_start).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{entry.hours}h
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{entry.tasks}</p>
              </button>
              <StatusBadge status={entry.status} />
            </div>

            {/* Expanded content + review actions */}
            {expanded === entry.id && (
              <div className="mt-3 space-y-3 pt-3 border-t">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Tasks</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.tasks}</p>
                </div>
                {entry.skills_practiced && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Skills Practiced</p>
                    <p className="text-sm text-gray-700">{entry.skills_practiced}</p>
                  </div>
                )}
                {entry.challenges && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Challenges</p>
                    <p className="text-sm text-gray-700">{entry.challenges}</p>
                  </div>
                )}

                {entry.status === 'submitted' && (
                  <div className="space-y-2 pt-1">
                    <Input
                      placeholder="Optional comment for the intern…"
                      value={comments[entry.id] ?? ''}
                      onChange={(e) =>
                        setComments((prev) => ({ ...prev, [entry.id]: e.target.value }))
                      }
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1"
                        disabled={isPending}
                        onClick={() => handleReview(entry.id, 'approved')}
                      >
                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-orange-600 border-orange-200 gap-1"
                        disabled={isPending}
                        onClick={() => handleReview(entry.id, 'needs_revision')}
                      >
                        <AlertCircle className="h-3 w-3" />
                        Request Revision
                      </Button>
                    </div>
                  </div>
                )}

                {entry.supervisor_comment && (
                  <div className="bg-indigo-50 rounded-lg p-2 text-xs text-indigo-700">
                    <strong>Your comment:</strong> {entry.supervisor_comment}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
