import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, Briefcase, UserCheck } from 'lucide-react';
import { InviteTeamMemberForm } from './InviteTeamMemberForm';
import { RemoveMemberButton } from './RemoveMemberButton';

export const dynamic = 'force-dynamic';

const ROLE_ICONS: Record<string, React.ElementType> = {
  owner:      Crown,
  recruiter:  Briefcase,
  supervisor: UserCheck,
};

const ROLE_COLORS: Record<string, string> = {
  owner:      'bg-amber-100 text-amber-700',
  recruiter:  'bg-blue-100 text-blue-700',
  supervisor: 'bg-green-100 text-green-700',
};

export default async function CompanyTeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: myMembership } = await supabase
    .from('company_members')
    .select('company_id, member_role')
    .eq('user_id', user.id)
    .single();

  if (!myMembership) redirect(`/${locale}/onboarding`);

  const isOwner = myMembership.member_role === 'owner';

  const { data: members } = await supabase
    .from('company_members')
    .select('id, member_role, created_at, profiles!company_members_user_id_fkey(id, full_name, phone, city, avatar_url)')
    .eq('company_id', myMembership.company_id)
    .order('created_at', { ascending: true });

  type MemberRow = NonNullable<typeof members>[number];

  function getProfile(m: MemberRow) {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles as Record<string, unknown> | null;
    return p as { id?: string; full_name?: string; phone?: string; city?: string } | null;
  }

  const owner = (members ?? []).find((m) => m.member_role === 'owner');
  const rest  = (members ?? []).filter((m) => m.member_role !== 'owner');

  return (
    <DashboardLayout locale={locale}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Team Members
          </h1>
          <p className="text-gray-500 mt-1">
            Manage who has access to your company account.
          </p>
        </div>

        {/* Invite form — owners only */}
        {isOwner && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Invite a Team Member</CardTitle>
            </CardHeader>
            <CardContent>
              <InviteTeamMemberForm companyId={myMembership.company_id} />
            </CardContent>
          </Card>
        )}

        {/* Role legend */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          {[
            { role: 'owner', desc: 'Full access — can manage company, team, and all internships' },
            { role: 'recruiter', desc: 'Can post internships and manage applicants' },
            { role: 'supervisor', desc: 'Can review logbooks and submit evaluations' },
          ].map(({ role, desc }) => {
            const Icon = ROLE_ICONS[role];
            return (
              <div key={role} className="flex items-start gap-1.5 bg-gray-50 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
                <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${ROLE_COLORS[role].split(' ')[1]}`} />
                <div>
                  <span className="font-semibold capitalize">{role}:</span> {desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Member list */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0 divide-y">
            {[owner, ...rest].filter(Boolean).map((m) => {
              if (!m) return null;
              const profile = getProfile(m);
              const Icon = ROLE_ICONS[m.member_role] ?? Users;
              const isCurrentUser = profile?.id === user.id;

              return (
                <div key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${ROLE_COLORS[m.member_role]}`}>
                      {profile?.full_name?.charAt(0) ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.full_name ?? '—'}
                        </p>
                        {isCurrentUser && (
                          <span className="text-xs text-gray-400">(you)</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {profile?.city ?? ''}
                        {profile?.phone ? ` · ${profile.phone}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs capitalize gap-1 ${ROLE_COLORS[m.member_role]}`}>
                      <Icon className="h-3 w-3" />
                      {m.member_role}
                    </Badge>
                    {isOwner && !isCurrentUser && m.member_role !== 'owner' && (
                      <RemoveMemberButton
                        memberId={m.id}
                        memberName={profile?.full_name ?? 'this member'}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {!members?.length && (
              <div className="py-10 text-center text-gray-400 text-sm">
                No team members found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
