'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createUniversityRegistrationRequest } from '@/lib/actions/university';

interface Props {
  universities: Array<{ id: string; name: string }>;
}

export function UniversityRegistrationRequestForm({ universities }: Props) {
  const router = useRouter();
  const [universityId, setUniversityId] = useState('');
  const [newUniversityName, setNewUniversityName] = useState('');
  const [documents, setDocuments] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();

  const isNewUniversity = universityId === 'new';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (documents.length === 0) {
      toast.error('Upload at least one campus affiliation document');
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      if (isNewUniversity) {
        formData.append('requested_university_name', newUniversityName);
      } else {
        formData.append('university_id', universityId);
      }
      documents.forEach((file) => formData.append('documents', file));

      const result = await createUniversityRegistrationRequest(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Request submitted for admin review');
      setDocuments([]);
      router.refresh();
    });
  };

  return (
    <Card className="w-full text-left border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Request university coordinator access</CardTitle>
        <p className="text-sm text-gray-500">
          Choose your institution. An administrator will review the request and link your
          account before enabling coordinator features.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="university-request">University</Label>
            <select
              id="university-request"
              value={universityId}
              onChange={(event) => setUniversityId(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
              disabled={isPending}
            >
              <option value="">Select your university</option>
              {universities.map((university) => (
                <option key={university.id} value={university.id}>
                  {university.name}
                </option>
              ))}
              <option value="new">My university is not listed</option>
            </select>
          </div>

          {isNewUniversity && (
            <div className="space-y-1.5">
              <Label htmlFor="new-university-name">Official university name</Label>
              <Input
                id="new-university-name"
                value={newUniversityName}
                onChange={(event) => setNewUniversityName(event.target.value)}
                placeholder="Enter the institution's official name"
                minLength={2}
                maxLength={200}
                required
                disabled={isPending}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="university-affiliation-documents">Campus affiliation documents</Label>
            <Input
              id="university-affiliation-documents"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              multiple
              required
              disabled={isPending}
              onChange={(event) => setDocuments(Array.from(event.target.files ?? []))}
            />
            <p className="text-xs text-gray-500">
              Required: upload up to 5 PDF or image files (10MB each), such as a staff ID,
              appointment letter, or official university authorization.
            </p>
            {documents.length > 0 && (
              <ul className="list-disc pl-5 text-xs text-gray-600">
                {documents.map((file) => <li key={`${file.name}-${file.size}`}>{file.name}</li>)}
              </ul>
            )}
          </div>

          <Button
            type="submit"
            disabled={isPending || !universityId || documents.length === 0 || (isNewUniversity && newUniversityName.trim().length < 2)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit for review
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
