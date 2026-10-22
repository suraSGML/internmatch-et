'use client';

import { useState } from 'react';
import { Download, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface Props {
  universityId: string;
}

export function ReportDownloadButtons({ universityId }: Props) {
  const [loading, setLoading] = useState<'csv' | 'json' | null>(null);

  const downloadCSV = async () => {
    setLoading('csv');
    try {
      const supabase = createClient();
      const { data: placements } = await supabase
        .from('placements')
        .select(`
          status, start_date, end_date,
          profiles!placements_student_id_fkey(full_name, phone),
          companies(name, city),
          applications(internships(title)),
          student_profiles(departments(name), year_of_study)
        `)
        .eq('university_id', universityId);

      if (!placements) return;

      const rows = placements.map((p) => {
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles as Record<string, unknown> | null;
        const company = Array.isArray(p.companies) ? p.companies[0] : p.companies as Record<string, unknown> | null;
        const app = Array.isArray(p.applications) ? p.applications[0] : p.applications as Record<string, unknown> | null;
        const internship = app ? (Array.isArray((app as Record<string, unknown>).internships) ? ((app as Record<string, unknown>).internships as Array<{title?: string}>)[0] : (app as Record<string, unknown>).internships as {title?: string} | null) : null;
        const sp = Array.isArray(p.student_profiles) ? p.student_profiles[0] : p.student_profiles as Record<string, unknown> | null;
        const dept = sp ? (Array.isArray((sp as Record<string, unknown>).departments) ? ((sp as Record<string, unknown>).departments as Array<{name?: string}>)[0] : (sp as Record<string, unknown>).departments as {name?: string} | null) : null;

        return [
          (profile as { full_name?: string } | null)?.full_name ?? '',
          (profile as { phone?: string } | null)?.phone ?? '',
          (dept as { name?: string } | null)?.name ?? '',
          (internship as { title?: string } | null)?.title ?? '',
          (company as { name?: string } | null)?.name ?? '',
          (company as { city?: string } | null)?.city ?? '',
          p.status,
          p.start_date ?? '',
          p.end_date ?? '',
        ];
      });

      const header = ['Student Name', 'Phone', 'Department', 'Internship Title', 'Company', 'City', 'Status', 'Start Date', 'End Date'];
      const csv = [header, ...rows]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `placement-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        className="gap-2"
        onClick={downloadCSV}
        disabled={loading === 'csv'}
      >
        {loading === 'csv' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
        )}
        Export CSV
      </Button>
      <Button
        variant="outline"
        className="gap-2 text-gray-500"
        disabled
      >
        <FileText className="h-4 w-4" />
        Export PDF (Coming soon)
      </Button>
    </div>
  );
}
