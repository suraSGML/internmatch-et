'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteTeamMember } from '@/lib/actions/company';

interface Props {
  companyId: string;
}

export function InviteTeamMemberForm({ companyId }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'recruiter' | 'supervisor'>('recruiter');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    startTransition(async () => {
      const result = await inviteTeamMember(companyId, email.trim(), role);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`${email} added to your team as ${role}`);
        setEmail('');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 space-y-1">
        <Label htmlFor="invite-email" className="text-xs text-gray-500">Email address</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="colleague@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Role</Label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'recruiter' | 'supervisor')}
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="recruiter">Recruiter</option>
          <option value="supervisor">Supervisor</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-500 invisible">Action</Label>
        <Button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 gap-2 w-full sm:w-auto"
          disabled={isPending || !email.trim()}
        >
          {isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <UserPlus className="h-4 w-4" />
          }
          Invite
        </Button>
      </div>
    </form>
  );
}
