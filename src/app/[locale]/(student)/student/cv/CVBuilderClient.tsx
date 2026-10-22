'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, FileText, Eye, CheckCircle2, AlertCircle, Upload, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { uploadStudentCV, removeStudentCV } from '@/lib/actions/profile';

interface Props {
  completeness: number;
  missingItems?: string[];
  uploadedCvUrl: string | null;
  locale: string;
}

const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Clean, ATS-friendly single-column layout. Best for traditional companies.',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Same content, slightly different header styling. Works well everywhere.',
  },
];

export function CVBuilderClient({ completeness, missingItems = [], uploadedCvUrl, locale }: Props) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<'classic' | 'modern'>('classic');
  const [generating, setGenerating] = useState(false);
  const [cvUrl, setCvUrl] = useState<string | null>(uploadedCvUrl);
  const [uploadingCv, setUploadingCv] = useState(false);

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('CV file must be under 10MB');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are supported');
      return;
    }

    setUploadingCv(true);
    try {
      const fd = new FormData();
      fd.append('cv', file);
      const res = await uploadStudentCV(fd);
      if (res.error) {
        toast.error(typeof res.error === 'string' ? res.error : 'Failed to upload CV');
      } else if (res.cvUrl) {
        setCvUrl(res.cvUrl);
        toast.success('CV uploaded successfully!');
        router.refresh();
      }
    } catch {
      toast.error('Failed to upload CV');
    } finally {
      setUploadingCv(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCvRemove = async () => {
    setUploadingCv(true);
    try {
      const res = await removeStudentCV();
      if (res.error) {
        toast.error('Failed to remove CV');
      } else {
        setCvUrl(null);
        toast.success('CV removed');
        router.refresh();
      }
    } catch {
      toast.error('Failed to remove CV');
    } finally {
      setUploadingCv(false);
    }
  };

  const completePct = Math.min(100, Math.max(0, completeness));
  const isProfileReady = completePct >= 40;

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/cv?template=${selectedTemplate}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Generation failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-cv.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CV downloaded successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not generate CV';
      toast.error(msg);
      alert(`${msg}. Please check your profile information.`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Profile completeness */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Profile Completeness</span>
            <span className={`font-bold ${completePct >= 60 ? 'text-green-600' : 'text-amber-600'}`}>
              {completePct}%
            </span>
          </div>
          <Progress value={completePct} className="h-2" />
          {missingItems.length > 0 ? (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  {completePct >= 60 ? 'Profile ready, but can be improved' : 'Your profile needs more information'}
                </p>
                <p className="text-xs mt-0.5">
                  Missing: {missingItems.slice(0, 3).join(', ')}
                  {missingItems.length > 3 ? ` and ${missingItems.length - 3} more` : ''}.
                </p>
                <Link
                  href={`/${locale}/student/profile`}
                  className="text-indigo-600 hover:underline text-xs mt-1 inline-block font-medium"
                >
                  Complete your profile →
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Profile is 100% complete!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template selector */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Choose Template</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id as 'classic' | 'modern')}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                selectedTemplate === t.id
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-semibold text-sm ${selectedTemplate === t.id ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {t.name}
                </span>
                {selectedTemplate === t.id && (
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs">Selected</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">{t.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Generate button */}
      <div className="flex gap-3">
        <Button
          onClick={handleDownload}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2 flex-1"
        >
          {generating ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {generating ? 'Generating…' : 'Download CV (PDF)'}
        </Button>
      </div>

      {/* Custom CV Upload Section */}
      <Card className="border-0 shadow-sm bg-gray-50/70 border border-gray-100">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {cvUrl ? 'Uploaded Custom CV' : 'Already have a CV?'}
                </p>
                <p className="text-xs text-gray-500">
                  {cvUrl
                    ? 'Your uploaded PDF is active and visible to employers.'
                    : 'Optionally upload your own PDF CV instead of generating one.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {cvUrl ? (
                <>
                  <a
                    href={cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 bg-white border border-gray-200 hover:bg-gray-50 px-2.5 py-1.5 rounded-md font-medium"
                  >
                    <Eye className="h-3 w-3" /> View
                  </a>
                  <Label
                    htmlFor="cv-upload-input"
                    className="cursor-pointer inline-flex items-center gap-1 text-xs text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-2.5 py-1.5 rounded-md font-medium"
                  >
                    <Upload className="h-3 w-3" /> Replace
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploadingCv}
                    onClick={handleCvRemove}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Label
                  htmlFor="cv-upload-input"
                  className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-3 py-1.5 rounded-md font-medium transition-colors"
                >
                  {uploadingCv ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploadingCv ? 'Uploading…' : 'Upload PDF CV'}
                </Label>
              )}
              <input
                id="cv-upload-input"
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={uploadingCv}
                onChange={handleCvUpload}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <p className="text-xs text-gray-400 text-center">
        Your CV is generated from your profile data. Keep your profile up to date for the best results.
        The PDF is ATS-friendly and works with all major job portals.
      </p>
    </div>
  );
}
