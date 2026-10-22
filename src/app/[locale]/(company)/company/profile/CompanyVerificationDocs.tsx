'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  Loader2,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  uploadCompanyVerificationDoc,
  deleteCompanyVerificationDoc,
} from '@/lib/actions/company';

export interface VerificationDoc {
  id: string;
  doc_type: string;
  file_path: string;
  created_at: string;
  review_note?: string | null;
  file_available?: boolean;
}

interface Props {
  companyId: string;
  status: string;
  initialDocs: VerificationDoc[];
  isOwner: boolean;
}

const DOC_TYPES: Record<string, string> = {
  registration: 'Business Registration / Trade License',
  tin: 'TIN / Tax Certificate',
  other: 'Other Supporting Document',
};

export function CompanyVerificationDocs({
  companyId,
  status,
  initialDocs,
  isOwner,
}: Props) {
  const router = useRouter();
  const [docs, setDocs] = useState<VerificationDoc[]>(initialDocs);
  const [docType, setDocType] = useState<string>('registration');
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Document must be under 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', docType);

      const res = await uploadCompanyVerificationDoc(companyId, fd);
      if (res.error) {
        toast.error(typeof res.error === 'string' ? res.error : 'Upload failed');
      } else if (res.doc) {
        setDocs((prev) => [res.doc as VerificationDoc, ...prev]);
        toast.success('Document uploaded! Admin has been notified for review.');
        router.refresh();
      }
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    setIsDeleting(docId);
    try {
      const res = await deleteCompanyVerificationDoc(docId, companyId);
      if (res.error) {
        toast.error(res.error);
      } else {
        setDocs((prev) => prev.filter((d) => d.id !== docId));
        toast.success('Document removed');
        router.refresh();
      }
    } catch {
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-indigo-600" />
              Registration & Verification Documents
            </CardTitle>
            <CardDescription className="text-xs">
              Upload your official business license or TIN certificate for admin verification.
            </CardDescription>
          </div>
          {status === 'verified' ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          ) : status === 'rejected' ? (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" /> Rejected
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1">
              <AlertCircle className="h-3 w-3" /> Pending Review
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Document Uploader */}
        {isOwner && (
          <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="doc-type-select" className="text-xs text-gray-700 font-medium">
                  Document Type
                </Label>
                <select
                  id="doc-type-select"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  disabled={isUploading}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="registration">Business Registration / Trade License</option>
                  <option value="tin">TIN Certificate</option>
                  <option value="other">Memorandum / Supporting Document</option>
                </select>
              </div>

              <div className="flex items-end">
                <Label
                  htmlFor="company-doc-file"
                  className={`w-full h-9 cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-white transition-colors ${
                    isUploading
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {isUploading ? 'Uploading…' : 'Select & Upload PDF / Image'}
                </Label>
                <input
                  id="company-doc-file"
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={isUploading}
                  onChange={handleUpload}
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500">
              Supported formats: PDF, JPG, PNG, WEBP (max 10MB). Documents are reviewed confidentially by system admins.
            </p>
          </div>
        )}

        {/* Uploaded Documents List */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Uploaded Documents ({docs.length})
          </p>

          {docs.length === 0 ? (
            <div className="p-6 text-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">No documents uploaded yet</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload your trade license or TIN to help admins verify your company.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-white hover:bg-gray-50/60 transition-colors gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {DOC_TYPES[doc.doc_type] || doc.doc_type}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Uploaded on {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc.file_available === false ? (
                      <span className="text-xs text-amber-700">File unavailable — upload again</span>
                    ) : (
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                      >
                        <Eye className="h-3 w-3" /> View
                      </a>
                    )}
                    {isOwner && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting === doc.id}
                        onClick={() => handleDelete(doc.id)}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                      >
                        {isDeleting === doc.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
