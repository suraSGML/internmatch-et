'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Send, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveLogbookEntry } from '@/lib/actions/logbook';

interface Props {
  placementId: string;
}

export function LogbookEntryForm({ placementId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [tasks, setTasks] = useState('');
  const [skills, setSkills] = useState('');
  const [challenges, setChallenges] = useState('');
  const [hours, setHours] = useState('');

  // Auto-compute week end when week start changes (Mon → Sun)
  const handleWeekStart = (val: string) => {
    setWeekStart(val);
    if (val) {
      const end = new Date(val);
      end.setDate(end.getDate() + 6);
      setWeekEnd(end.toISOString().split('T')[0]);
    }
  };

  const handleSave = (submitNow: boolean) => {
    if (!weekStart || !tasks.trim() || !hours) {
      toast.error('Week start, tasks, and hours are required');
      return;
    }
    startTransition(async () => {
      const result = await saveLogbookEntry(
        {
          placement_id: placementId,
          week_start: weekStart,
          week_end: weekEnd || weekStart,
          tasks,
          skills_practiced: skills || undefined,
          challenges: challenges || undefined,
          hours: Number(hours),
        },
        submitNow
      );
      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Could not save entry');
        return;
      }
      toast.success(submitNow ? 'Entry submitted for review' : 'Draft saved');
      setWeekStart(''); setWeekEnd(''); setTasks('');
      setSkills(''); setChallenges(''); setHours('');
      setOpen(false);
    });
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="bg-indigo-600 hover:bg-indigo-700 gap-2"
      >
        <Plus className="h-4 w-4" /> New Weekly Entry
      </Button>
    );
  }

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-indigo-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          New Logbook Entry
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="week_start">Week Start *</Label>
            <Input
              id="week_start"
              type="date"
              value={weekStart}
              onChange={(e) => handleWeekStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="week_end">Week End</Label>
            <Input
              id="week_end"
              type="date"
              value={weekEnd}
              onChange={(e) => setWeekEnd(e.target.value)}
            />
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-1.5">
          <Label htmlFor="tasks">Tasks Completed *</Label>
          <textarea
            id="tasks"
            rows={4}
            placeholder="Describe the tasks you worked on this week…"
            value={tasks}
            onChange={(e) => setTasks(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Skills & challenges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="skills">Skills Practiced</Label>
            <Input
              id="skills"
              placeholder="e.g. Python, FastAPI, teamwork"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hours">Hours Worked *</Label>
            <Input
              id="hours"
              type="number"
              min={0.5}
              max={168}
              step={0.5}
              placeholder="e.g. 40"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="challenges">Challenges Faced</Label>
          <textarea
            id="challenges"
            rows={2}
            placeholder="What was difficult? How did you handle it?"
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleSave(false)}
            className="gap-2"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => handleSave(true)}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit for Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
