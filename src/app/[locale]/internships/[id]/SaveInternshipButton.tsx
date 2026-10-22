'use client';

import { useState, useTransition } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { saveInternship } from '@/lib/actions/internships';

interface Props {
  internshipId: string;
  initialSaved: boolean;
}

export function SaveInternshipButton({ internshipId, initialSaved }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const result = await saveInternship(internshipId);
      if ('error' in result) {
        toast.error('Could not save internship');
        return;
      }
      setSaved(result.saved);
      toast.success(result.saved ? 'Saved to your list' : 'Removed from saved');
    });
  };

  return (
    <Button
      variant="outline"
      className={`w-full gap-2 ${saved ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : ''}`}
      onClick={handleToggle}
      disabled={isPending}
    >
      <Bookmark className={`h-4 w-4 ${saved ? 'fill-indigo-600' : ''}`} />
      {saved ? 'Saved' : 'Save'}
    </Button>
  );
}
