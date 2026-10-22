import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateICS } from '@/lib/ics/generateICS';

/**
 * GET /api/interviews/[id]/ics
 * Returns a downloadable .ics file for the interview calendar invite.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch interview with related data
  const { data: interview } = await supabase
    .from('interviews')
    .select(`
      id, scheduled_at, mode, location_or_link, notes,
      applications(
        id, student_id,
        internships(title, companies(name))
      )
    `)
    .eq('id', id)
    .single();

  if (!interview) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  // Verify the user is the student or company member
  const app = Array.isArray(interview.applications)
    ? interview.applications[0]
    : interview.applications as { student_id?: string; internships?: unknown } | null;

  if (!app) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const internship = Array.isArray(app.internships)
    ? (app.internships as Array<{ title?: string; companies?: unknown }>)[0]
    : app.internships as { title?: string; companies?: unknown } | null;

  const companyRaw = internship?.companies;
  const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw as { name?: string } | null;

  const title = internship?.title
    ? `Interview: ${internship.title} at ${company?.name ?? 'Company'}`
    : 'InternMatch ET Interview';

  const icsContent = generateICS({
    uid: interview.id,
    title,
    description: interview.notes ?? `${(interview.mode as string).replace('_', ' ')} interview`,
    location: interview.location_or_link ?? '',
    startDate: new Date(interview.scheduled_at),
    durationMinutes: 60,
  });

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="interview-${interview.id}.ics"`,
    },
  });
}
