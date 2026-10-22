'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Send, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { submitApplication } from '@/lib/actions/applications';

interface Question {
  id: string;
  question: string;
  is_required: boolean;
}

interface Props {
  internshipId: string;
  questions: Question[];
  cvUrl: string | null;
  locale: string;
}

export function ApplyForm({ internshipId, questions, cvUrl, locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [coverNote, setCoverNote] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(questions.map((q) => [q.id, '']))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required answers
    for (const q of questions) {
      if (q.is_required && !answers[q.id]?.trim()) {
        toast.error(`Please answer: "${q.question}"`);
        return;
      }
    }

    startTransition(async () => {
      const result = await submitApplication({
        internship_id: internshipId,
        cover_note: coverNote || undefined,
        cv_url: cvUrl || undefined,
        answers: Object.entries(answers)
          .filter(([, v]) => v.trim())
          .map(([question_id, answer]) => ({ question_id, answer })),
      });

      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Could not submit application');
        return;
      }

      toast.success('Application submitted!');
      router.push(`/${locale}/student/applications`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cover note */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cover Note</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            rows={5}
            placeholder="Introduce yourself and explain why you're a great fit for this internship…"
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-gray-400 mt-1">
            Optional but recommended. Max 2000 characters ({coverNote.length}/2000).
          </p>
        </CardContent>
      </Card>

      {/* CV */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-800">CV</p>
              {cvUrl ? (
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    View uploaded CV
                  </a>
                  <span className="text-xs text-gray-400">· Will be attached</span>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  No CV uploaded yet.{' '}
                  <a href={`/${locale}/student/cv`} className="text-indigo-600 hover:underline">
                    Upload your CV
                  </a>{' '}
                  before applying.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screening questions */}
      {questions.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Screening Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="space-y-1.5">
                <Label htmlFor={`q-${q.id}`} className="text-sm leading-snug">
                  {i + 1}. {q.question}
                  {q.is_required && <span className="text-red-400 ml-1">*</span>}
                </Label>
                <textarea
                  id={`q-${q.id}`}
                  rows={3}
                  placeholder="Your answer…"
                  value={answers[q.id] ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Anti-scam notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
        ⚠️ <strong>Safety reminder:</strong> Legitimate internships never ask you to pay fees or
        deposits. If asked for money, report the listing immediately.
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {isPending ? 'Submitting…' : 'Submit Application'}
      </Button>
    </form>
  );
}
