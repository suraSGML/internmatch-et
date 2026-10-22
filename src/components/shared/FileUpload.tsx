'use client';

import { useRef, useState } from 'react';
import { Upload, File, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  accept?: string;
  maxSizeMB?: number;
  onUpload: (file: File) => Promise<{ url?: string; error?: string }>;
  currentUrl?: string;
  label?: string;
  hint?: string;
  className?: string;
}

export function FileUpload({
  accept = '.pdf',
  maxSizeMB = 5,
  onUpload,
  currentUrl,
  label = 'Upload file',
  hint,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | undefined>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    setFileName(file.name);
    const result = await onUpload(file);
    setUploading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.url) {
      setUploadedUrl(result.url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          uploading
            ? 'border-indigo-300 bg-indigo-50'
            : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {uploadedUrl && !uploading ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm font-medium text-green-700">
              {fileName ?? 'File uploaded'}
            </p>
            <a
              href={uploadedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View file
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setUploadedUrl(undefined);
                setFileName(null);
              }}
            >
              Replace
            </Button>
          </div>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-indigo-600">Uploading {fileName}…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">{label}</p>
            {hint && <p className="text-xs text-gray-400">{hint}</p>}
            <p className="text-xs text-gray-400">
              Max {maxSizeMB}MB · {accept.replace(/\./g, '').toUpperCase()}
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
