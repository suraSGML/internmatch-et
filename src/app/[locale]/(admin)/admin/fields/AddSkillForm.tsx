'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addSkill } from '@/lib/actions/admin';

export function AddSkillForm() {
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await addSkill(name.trim());
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Skill added');
        setName('');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Skill name (e.g. Python)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="text-sm"
      />
      <Button
        type="submit"
        size="sm"
        className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
        disabled={isPending || !name.trim()}
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
      </Button>
    </form>
  );
}
