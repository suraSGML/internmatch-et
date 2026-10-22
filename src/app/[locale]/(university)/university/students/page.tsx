import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap, Search, MapPin, BookOpen, X } from 'lucide-react';
import { DepartmentManager } from './DepartmentManager';

export const dynamic = 'force-dynamic';

export default async function UniversityStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; dept?: string; status?: string }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  const searchTerm = filters.q?.trim().toLocaleLowerCase() ?? '';
  const selectedStatus = filters.status ?? '';
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();
  const { data: membership, error: membershipError } = await service
    .from('university_members')
    .select('university_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) {
    throw new Error(`Could not load coordinator campus: ${membershipError.message}`);
  }
  if (!membership) redirect(`/${locale}/university/settings`);

  // Get students at this university.
  const query = service
    .from('student_profiles')
    .select(`
      id, user_id, year_of_study, student_number, cv_url, visibility,
      profiles!student_profiles_user_id_fkey(full_name, phone, city, avatar_url),
      departments(name)
    `)
    .eq('university_id', membership.university_id)
    .order('created_at', { ascending: false });
  const { data: campusStudents, error: studentsError } = await (filters.dept
    ? query.eq('department_id', filters.dept)
    : query);
  if (studentsError) {
    throw new Error(`Could not load students for this campus: ${studentsError.message}`);
  }

  const studentUserIds = (campusStudents ?? []).map((student) => student.user_id);
  const placementsByStudent = new Map<string, Array<{ status: string }>>();
  const applicationsByStudent = new Map<string, Array<{ status: string }>>();
  if (studentUserIds.length > 0) {
    const [placementsResult, applicationsResult] = await Promise.all([
      service
        .from('placements')
        .select('student_id, status')
        .eq('university_id', membership.university_id)
        .in('student_id', studentUserIds),
      service
        .from('applications')
        .select('student_id, status')
        .in('student_id', studentUserIds),
    ]);
    const { data: placements, error: placementsError } = placementsResult;
    if (placementsError) {
      throw new Error(`Could not load campus placements: ${placementsError.message}`);
    }
    const { data: applications, error: applicationsError } = applicationsResult;
    if (applicationsError) {
      throw new Error(`Could not load campus student applications: ${applicationsError.message}`);
    }

    for (const placement of placements ?? []) {
      const studentPlacements = placementsByStudent.get(placement.student_id) ?? [];
      studentPlacements.push({ status: placement.status });
      placementsByStudent.set(placement.student_id, studentPlacements);
    }
    for (const application of applications ?? []) {
      const studentApplications = applicationsByStudent.get(application.student_id) ?? [];
      studentApplications.push({ status: application.status });
      applicationsByStudent.set(application.student_id, studentApplications);
    }
  }

  const students = (campusStudents ?? []).map((student) => ({
    ...student,
    placements: placementsByStudent.get(student.user_id) ?? [],
    applications: applicationsByStudent.get(student.user_id) ?? [],
  }));

  // Get departments for filter
  const { data: departments, error: departmentsError } = await service
    .from('departments')
    .select('id, name')
    .eq('university_id', membership.university_id)
    .order('name');
  if (departmentsError) {
    throw new Error(`Could not load campus departments: ${departmentsError.message}`);
  }

  const getStudentStatus = (
    placements: Array<{ status: string }>,
    applications: Array<{ status: string }>
  ): string => {
    for (const status of ['active', 'approved', 'pending_approval']) {
      if (placements.some((placement) => placement.status === status)) return status;
    }
    for (const status of ['accepted', 'offered', 'interview_scheduled', 'shortlisted', 'under_review', 'submitted']) {
      if (applications.some((application) => application.status === status)) return status;
    }
    if (placements.some((placement) => placement.status === 'completed')) return 'completed';
    for (const status of ['rejected', 'declined', 'withdrawn']) {
      if (applications.some((application) => application.status === status)) return status;
    }
    for (const status of ['terminated', 'rejected']) {
      if (placements.some((placement) => placement.status === status)) return status;
    }
    return 'searching';
  };

  // Search across the identifying details coordinators commonly use.
  const filtered = students.filter((student) => {
    const profile = Array.isArray(student.profiles)
      ? student.profiles[0]
      : student.profiles as { full_name?: string; phone?: string; city?: string } | null;
    const department = Array.isArray(student.departments)
      ? student.departments[0]
      : student.departments as { name?: string } | null;
    const searchableFields = [
      profile?.full_name,
      profile?.phone,
      profile?.city,
      student.student_number,
      department?.name,
    ];
    const matchesQuery = !searchTerm || searchableFields.some(
      (value) => value?.toLocaleLowerCase().includes(searchTerm)
    );
    const matchesStatus = !selectedStatus || getStudentStatus(student.placements, student.applications) === selectedStatus;
    return matchesQuery && matchesStatus;
  });

  const stats = {
    total: filtered.length,
    placed: filtered.filter((s) => ['active', 'approved'].includes(getStudentStatus(s.placements, s.applications))).length,
    searching: filtered.filter((s) => getStudentStatus(s.placements, s.applications) === 'searching').length,
    completed: filtered.filter((s) => getStudentStatus(s.placements, s.applications) === 'completed').length,
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 mt-1">
            {filtered.length} {searchTerm || filters.dept || selectedStatus ? 'matching' : 'registered'} · {stats.placed} placed · {stats.searching} searching
          </p>
        </div>

        <DepartmentManager departments={departments ?? []} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700' },
            { label: 'Placed', value: stats.placed, color: 'text-green-600' },
            { label: 'Searching', value: stats.searching, color: 'text-amber-600' },
            { label: 'Completed', value: stats.completed, color: 'text-blue-600' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="pt-3 pb-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <form method="GET" className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.55fr)_minmax(170px,0.45fr)_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                name="q"
                type="search"
                placeholder="Name, student ID, phone or city"
                defaultValue={filters.q}
                aria-label="Search students"
                className="pl-9"
              />
            </div>
            <select
              name="dept"
              defaultValue={filters.dept ?? ''}
              aria-label="Filter by department"
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All departments</option>
              {(departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={selectedStatus}
              aria-label="Filter by placement status"
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All placement statuses</option>
              <option value="searching">Searching</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview_scheduled">Interview scheduled</option>
              <option value="offered">Offer sent</option>
              <option value="accepted">Offer accepted</option>
              <option value="pending_approval">Pending approval</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="terminated">Terminated</option>
              <option value="rejected">Rejected</option>
              <option value="declined">Offer declined</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              <Search className="h-4 w-4" />
              Search
            </Button>
            {(filters.q || filters.dept || filters.status) && (
              <Button asChild type="button" variant="outline">
                <a href={`/${locale}/university/students`}>
                  <X className="h-4 w-4" />
                  Clear
                </a>
              </Button>
            )}
          </div>
        </form>

        {/* Student list */}
        <div className="space-y-3">
          {filtered.map((student) => {
            const profile = Array.isArray(student.profiles)
              ? student.profiles[0]
              : student.profiles as { full_name?: string; phone?: string; city?: string } | null;
            const dept = Array.isArray(student.departments)
              ? student.departments[0]
              : student.departments as { name?: string } | null;
            const studentStatus = getStudentStatus(student.placements, student.applications);

            return (
              <Card key={student.id} className="border-0 shadow-sm">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                        <GraduationCap className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {(profile as { full_name?: string } | null)?.full_name ?? '—'}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-0.5">
                          {(dept as { name?: string } | null)?.name && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {(dept as { name: string }).name}
                            </span>
                          )}
                          {student.year_of_study && (
                            <span>Year {student.year_of_study}</span>
                          )}
                          {(profile as { city?: string } | null)?.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {(profile as { city: string }).city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={studentStatus} />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center text-gray-400 text-sm">
                {searchTerm || filters.dept || selectedStatus
                  ? 'No students match these filters. Try changing your search or clearing the filters.'
                  : 'No students have registered at this campus yet.'}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
