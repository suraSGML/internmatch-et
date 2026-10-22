'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { deleteSkill } from '@/lib/actions/admin';

export function DeleteSkillButton({ skillId, skillName }: { skillId: string; skillName: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="h-5 w-5 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Delete skill "${skillName}"?`)) return;
        startTransition(async () => {
          const result = await deleteSkill(skillId);
          if (result?.error) toast.error(result.error);
          else toast.success('Skill deleted');
        });
      }}
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
    </button>
  );
}
