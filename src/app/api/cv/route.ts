import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateCVPDF, type CVTemplate } from '@/lib/pdf/generateCV';

/**
 * GET /api/cv?template=classic|modern
 * Generates and streams a PDF CV for the current user.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const service = createServiceClient();

  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const authRes = await service.auth.getUser(token);
      user = authRes.data.user;
    }
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: account, error: accountError } = await service
    .from('profiles')
    .select('is_suspended')
    .eq('id', user.id)
    .maybeSingle();
  if (accountError) {
    console.error('Could not verify CV download account status:', accountError.message);
    return NextResponse.json({ error: 'Could not verify account status' }, { status: 500 });
  }
  if (account?.is_suspended) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
  }

  const template = (request.nextUrl.searchParams.get('template') ?? 'classic') as CVTemplate;

  // Fetch base profile and student profile safely with service role
  const [{ data: profile }, { data: sp }] = await Promise.all([
    service.from('profiles').select('full_name, phone, city').eq('id', user.id).maybeSingle(),
    service
      .from('student_profiles')
      .select('id, bio, skills, languages, links, cv_url, year_of_study, universities(name), departments(name)')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  let education: Array<{
    institution: string;
    degree: string;
    field: string;
    start_date?: string | null;
    end_date?: string | null;
    gpa?: number | null;
  }> = [];

  let experience: Array<{
    title: string;
    organization: string;
    location?: string | null;
    start_date?: string;
    end_date?: string | null;
    is_current?: boolean;
    description?: string | null;
  }> = [];

  let projects: Array<{
    title: string;
    description?: string | null;
    link?: string | null;
  }> = [];

  let certifications: Array<{
    title: string;
    issuer: string;
    issued_date?: string | null;
  }> = [];

  if (sp?.id) {
    const [edRes, expRes, projRes, certRes] = await Promise.all([
      service
        .from('education')
        .select('institution, degree, field, start_date, end_date, gpa')
        .eq('student_id', sp.id)
        .order('start_date', { ascending: false }),
      service
        .from('experience')
        .select('title, organization, location, start_date, end_date, is_current, description')
        .eq('student_id', sp.id)
        .order('start_date', { ascending: false }),
      service
        .from('projects')
        .select('title, description, link')
        .eq('student_id', sp.id),
      service
        .from('student_certifications')
        .select('title, issuer, issued_date')
        .eq('student_id', sp.id),
    ]);

    education = edRes.data ?? [];
    experience = expRes.data ?? [];
    projects = projRes.data ?? [];
    certifications = certRes.data ?? [];
  }

  // Fallback: If education table is empty, construct an education entry from student_profiles
  if (education.length === 0 && sp) {
    const uniData = Array.isArray(sp.universities) ? sp.universities[0] : (sp.universities as { name?: string } | null);
    const deptData = Array.isArray(sp.departments) ? sp.departments[0] : (sp.departments as { name?: string } | null);
    const uniName = uniData?.name;
    const deptName = deptData?.name;
    const yearStr = sp.year_of_study ? `Year ${sp.year_of_study}` : '';

    if (uniName || deptName) {
      education = [
        {
          institution: uniName || 'University',
          degree: yearStr ? `Undergraduate (${yearStr})` : 'Undergraduate Degree',
          field: deptName || 'General Studies',
          start_date: null,
          end_date: null,
          gpa: null,
        },
      ];
    }
  }

  const rawLinks = (sp?.links ?? {}) as Record<string, string>;

  // Normalize skills safely
  const rawSkills = Array.isArray(sp?.skills) ? sp.skills : [];
  const normalizedSkills = rawSkills
    .map((s: unknown) => {
      if (typeof s === 'string') return { name: s, level: 'intermediate' };
      if (typeof s === 'object' && s !== null && 'name' in s) {
        return {
          name: String((s as { name: string }).name),
          level: (s as { level?: string }).level ?? '',
        };
      }
      return { name: String(s), level: '' };
    })
    .filter((s) => Boolean(s.name));

  // Normalize languages safely
  const rawLangs = Array.isArray(sp?.languages) ? sp.languages : [];
  const normalizedLangs = rawLangs
    .map((l: unknown) => {
      if (typeof l === 'string') return { language: l, level: 'fluent' };
      if (typeof l === 'object' && l !== null && 'language' in l) {
        return {
          language: String((l as { language: string }).language),
          level: (l as { level?: string }).level ?? '',
        };
      }
      return { language: String(l), level: '' };
    })
    .filter((l) => Boolean(l.language));

  const cvData = {
    full_name: profile?.full_name ?? user.user_metadata?.full_name ?? 'Student',
    email: user.email ?? '',
    phone: profile?.phone,
    city: profile?.city,
    linkedin: rawLinks.linkedin,
    github: rawLinks.github,
    portfolio: rawLinks.portfolio,
    bio: sp?.bio,
    skills: normalizedSkills,
    languages: normalizedLangs,
    education,
    experience,
    projects,
    certifications,
  };

  try {
    const pdfBytes = await generateCVPDF(cvData, template);
    const safeName = (profile?.full_name ?? 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}_CV.pdf`;

    return new Response(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('CV generation error:', err);
    return NextResponse.json({ error: 'Failed to generate CV' }, { status: 500 });
  }
}
