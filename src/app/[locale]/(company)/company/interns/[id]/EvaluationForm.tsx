'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Star, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { submitEvaluation } from '@/lib/actions/logbook';

const CRITERIA = [
  { key: 'punctuality', label: 'Punctuality & Reliability' },
  { key: 'technical_skills', label: 'Technical Skills' },
  { key: 'communication', label: 'Communication' },
  { key: 'teamwork', label: 'Teamwork' },
  { key: 'initiative', label: 'Initiative & Proactiveness' },
];

interface Props {
  placementId: string;
  existingTypes: string[];
}

export function EvaluationForm({ placementId, existingTypes }: Props) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<'midterm' | 'final'>(
    existingTypes.includes('midterm') ? 'final' : 'midterm'
  );
  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(CRITERIA.map((c) => [c.key, 0]))
  );
  const [comments, setComments] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [visibleToStudent, setVisibleToStudent] = useState(false);

  const availableTypes = (['midterm', 'final'] as const).filter(
    (t) => !existingTypes.includes(t)
  );

  if (availableTypes.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-6 text-center text-sm text-gray-500">
          Both evaluations have been submitted.
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = () => {
    const allRated = CRITERIA.every((c) => ratings[c.key] > 0);
    if (!allRated) {
      toast.error('Please rate all criteria before submitting');
      return;
    }
    startTransition(async () => {
      const result = await submitEvaluation({
        placement_id: placementId,
        type,
        ratings: ratings as Parameters<typeof submitEvaluation>[0]['ratings'],
        comments: comments || undefined,
        recommendation: recommendation || undefined,
        visible_to_student: visibleToStudent,
      });
      if (result.error) toast.error('Could not submit evaluation');
      else toast.success('Evaluation submitted');
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Submit Evaluation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Type selector */}
        <div className="flex gap-3">
          {availableTypes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium capitalize transition-colors ${
                type === t
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t} Evaluation
            </button>
          ))}
        </div>

        {/* Rating criteria */}
        <div className="space-y-3">
          {CRITERIA.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700 flex-1">{label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatings((prev) => ({ ...prev, [key]: n }))}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-5 w-5 transition-colors ${
                        n <= (ratings[key] ?? 0)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200 hover:text-amber-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="comments">Overall Comments</Label>
          <textarea
            id="comments"
            rows={3}
            placeholder="Describe the intern's overall performance…"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="recommendation">Recommendation</Label>
          <textarea
            id="recommendation"
            rows={2}
            placeholder="Would you hire them? Recommend to others?"
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input
            type="checkbox"
            checked={visibleToStudent}
            onChange={(e) => setVisibleToStudent(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          Share evaluation with the intern
        </label>

        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit {type} Evaluation
        </Button>
      </CardContent>
    </Card>
  );
}
