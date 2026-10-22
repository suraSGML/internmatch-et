'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addField } from '@/lib/actions/admin';

export function AddFieldForm() {
  const [nameEn, setNameEn] = useState('');
  const [nameAm, setNameAm] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;
    startTransition(async () => {
      const result = await addField(nameEn.trim(), nameAm.trim());
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Field added');
        setNameEn('');
        setNameAm('');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder="English name (e.g. Information Technology)"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className="text-sm"
        />
        <Input
          placeholder="Amharic name (optional)"
          value={nameAm}
          onChange={(e) => setNameAm(e.target.value)}
          className="text-sm"
        />
      </div>
      <Button
        type="submit"
        size="sm"
        className="self-start bg-indigo-600 hover:bg-indigo-700"
        disabled={isPending || !nameEn.trim()}
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
        Add Field
      </Button>
    </form>
  );
}
