import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
  description: string,
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not query ${description}: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Reminder job is not configured.' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const service = createServiceClient();
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const interviews = await fetchAllPages('upcoming interviews for reminders', (from, to) => service
    .from('interviews')
    .select(`
      id, scheduled_at,
      applications!inner(id, student_id, status, internships(title, companies(name)))
    `)
    .eq('status', 'scheduled')
    .eq('applications.status', 'interview_scheduled')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', in24Hours.toISOString())
    .range(from, to));

  const todayInEthiopia = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const threeDaysAhead = new Date(`${todayInEthiopia}T00:00:00Z`);
  threeDaysAhead.setUTCDate(threeDaysAhead.getUTCDate() + 3);
  const deadlineThrough = threeDaysAhead.toISOString().slice(0, 10);

  const savedRows = await fetchAllPages('saved listings for deadline reminders', (from, to) => service
    .from('saved_internships')
    .select('user_id, internship_id, internships!inner(id, title, deadline, status)')
    .gte('internships.deadline', todayInEthiopia)
    .lte('internships.deadline', deadlineThrough)
    .eq('internships.status', 'open')
    .range(from, to));

  const userIds = [...new Set((savedRows ?? []).map((row) => row.user_id))];
  const appliedInternshipIds = new Map<string, Set<string>>();
  for (let index = 0; index < userIds.length; index += 200) {
    const userIdBatch = userIds.slice(index, index + 200);
    const applications = await fetchAllPages('applications before deadline reminders', (from, to) => service
      .from('applications')
      .select('student_id, internship_id')
      .in('student_id', userIdBatch)
      .range(from, to));
    for (const application of applications ?? []) {
      const ids = appliedInternshipIds.get(application.student_id) ?? new Set<string>();
      ids.add(application.internship_id);
      appliedInternshipIds.set(application.student_id, ids);
    }
  }

  let sent = 0;
  const sendOnce = async (
    userId: string,
    reminderKey: string,
    title: string,
    body: string,
    link: string
  ) => {
    const { data: claimed, error: claimError } = await service
      .from('user_reminders')
      .insert({ user_id: userId, reminder_key: reminderKey })
      .select('id')
      .maybeSingle();
    if (claimError?.code === '23505') return;
    if (claimError) throw new Error(`Could not record reminder delivery: ${claimError.message}`);
    if (!claimed) return;

    const { error: notificationError } = await service.from('notifications').insert({
      user_id: userId,
      type: 'general',
      title,
      body,
      link,
    });
    if (notificationError) {
      const { error: rollbackError } = await service.from('user_reminders').delete().eq('id', claimed.id);
      if (rollbackError) {
        throw new Error(`Could not create notification (${notificationError.message}) or release its reminder lock (${rollbackError.message}).`);
      }
      throw new Error(`Could not create reminder notification: ${notificationError.message}`);
    }
    sent += 1;
  };

  for (const interview of interviews ?? []) {
    const application = Array.isArray(interview.applications)
      ? interview.applications[0]
      : interview.applications;
    if (!application) continue;
    const internship = Array.isArray(application.internships)
      ? application.internships[0]
      : application.internships;
    const company = internship
      ? (Array.isArray(internship.companies) ? internship.companies[0] : internship.companies)
      : null;
    await sendOnce(
      application.student_id,
      `interview:${interview.id}`,
      'Interview reminder',
      `Your interview${internship?.title ? ` for ${internship.title}` : ''} is scheduled within the next 24 hours${company?.name ? ` with ${company.name}` : ''}. Check the interview page for time and meeting details.`,
      '/student/interviews'
    );
  }

  for (const row of savedRows ?? []) {
    const internship = Array.isArray(row.internships) ? row.internships[0] : row.internships;
    if (!internship || appliedInternshipIds.get(row.user_id)?.has(internship.id)) continue;
    const daysLeft = Math.max(0, Math.ceil(
      (new Date(`${internship.deadline}T00:00:00+03:00`).getTime() - new Date(`${todayInEthiopia}T00:00:00+03:00`).getTime()) /
      (24 * 60 * 60 * 1000)
    ));
    await sendOnce(
      row.user_id,
      `saved-deadline:${internship.id}`,
      'Saved internship deadline approaching',
      `${internship.title} closes ${daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}. Review the requirements and apply if it is a fit.`,
      `/internships/${internship.id}`
    );
  }

  return NextResponse.json({ success: true, remindersSent: sent });
}
