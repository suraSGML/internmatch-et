'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { postAnnouncement } from '@/lib/actions/university';

interface Props {
  universityId: string;
  departments: Array<{ id: string; name: string }>;
}

export function AnnouncementForm({ universityId, departments }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deptId, setDeptId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    startTransition(async () => {
      const result = await postAnnouncement(universityId, {
        title,
        body,
        department_id: deptId || undefined,
      });
      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Could not post announcement');
        return;
      }
      toast.success('Announcement posted');
      setTitle('');
      setBody('');
      setDeptId('');
      router.refresh();
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Announcement</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Important deadline reminder"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept">Department (optional)</Label>
              <select
                id="dept"
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Message *</Label>
            <textarea
              id="body"
              rows={3}
              placeholder="Write your announcement here…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post Announcement
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
