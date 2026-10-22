'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  createUniversityDepartment,
  deleteUniversityDepartment,
  renameUniversityDepartment,
} from '@/lib/actions/university';

interface Department {
  id: string;
  name: string;
}

export function DepartmentManager({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isPending, startTransition] = useTransition();

  const addDepartment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await createUniversityDepartment(newName);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Department added');
      setNewName('');
      router.refresh();
    });
  };

  const saveRename = (departmentId: string) => {
    startTransition(async () => {
      const result = await renameUniversityDepartment(departmentId, editingName);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Department renamed');
      setEditingId(null);
      router.refresh();
    });
  };

  const removeDepartment = (department: Department) => {
    if (!window.confirm(`Remove "${department.name}"? Students assigned to it will become unassigned.`)) return;
    startTransition(async () => {
      const result = await deleteUniversityDepartment(department.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Department removed');
      router.refresh();
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Manage departments</CardTitle>
        <p className="text-sm text-gray-500">
          Keep your campus department list up to date. Students can select these departments
          when setting up their profiles.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={addDepartment} className="flex gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Computer Science"
            minLength={2}
            maxLength={120}
            required
            disabled={isPending}
            aria-label="New department name"
          />
          <Button type="submit" disabled={isPending || newName.trim().length < 2} className="shrink-0">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1">Add</span>
          </Button>
        </form>

        {departments.length ? (
          <ul className="divide-y rounded-md border">
            {departments.map((department) => (
              <li key={department.id} className="flex items-center gap-2 p-2">
                {editingId === department.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      maxLength={120}
                      disabled={isPending}
                      aria-label={`Rename ${department.name}`}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isPending || editingName.trim().length < 2}
                      aria-label="Save department name"
                      onClick={() => saveRename(department.id)}
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      aria-label="Cancel rename"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm">{department.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      aria-label={`Rename ${department.name}`}
                      onClick={() => {
                        setEditingId(department.id);
                        setEditingName(department.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      aria-label={`Remove ${department.name}`}
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removeDepartment(department)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-gray-500">
            No departments have been added for this campus yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
