'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Briefcase, GraduationCap, Building2, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { updateStudentProfile, createCompany, getDepartmentsByUniversity } from '@/lib/actions/profile';

interface Props {
  role: string;
  fullName: string;
  userId: string;
  universities: Array<{ id: string; name: string }>;
  locale: string;
}

export function OnboardingFlow({ role, fullName, universities, locale }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Student onboarding
  const [universityId, setUniversityId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const departmentRequestId = useRef(0);
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [bio, setBio] = useState('');

  // Load departments when university changes
  const handleUniversityChange = async (newUniId: string) => {
    const requestId = ++departmentRequestId.current;
    setUniversityId(newUniId);
    setDepartmentId('');
    setAvailableDepartments([]);
    if (newUniId) {
      setIsLoadingDepartments(true);
      try {
        const depts = await getDepartmentsByUniversity(newUniId);
        if (requestId === departmentRequestId.current) setAvailableDepartments(depts);
      } catch {
        if (requestId === departmentRequestId.current) {
          toast.error('Could not load this university’s departments. Please try again.');
        }
      } finally {
        if (requestId === departmentRequestId.current) setIsLoadingDepartments(false);
      }
    } else {
      setIsLoadingDepartments(false);
    }
  };

  // Company onboarding
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');

  const totalSteps = role === 'student' ? 3 : role === 'company' ? 2 : 1;
  const progress = (step / totalSteps) * 100;

  const isDeptValid = Boolean(
    availableDepartments.some((department) => department.id === departmentId)
  );

  const handleStudentFinish = () => {
    startTransition(async () => {
      const fd = new FormData();
      if (universityId) fd.append('university_id', universityId);
      if (yearOfStudy) fd.append('year_of_study', yearOfStudy);
      if (bio) fd.append('bio', bio);
      if (departmentId) fd.append('department_id', departmentId);
      fd.append('visibility', 'all_verified');

      const result = await updateStudentProfile(fd);
      if (result?.error) {
        const msg = typeof result.error === 'string'
          ? result.error
          : JSON.stringify(result.error);
        toast.error(msg);
        return;
      }
      toast.success('Profile created! Welcome to InternMatch ET.');
      router.push(`/${locale}/student/dashboard`);
      router.refresh();
    });
  };

  const handleCompanyFinish = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append('name', companyName.trim());
      if (industry) fd.append('industry', industry);
      if (city.trim()) fd.append('city', city.trim());

      const result = await createCompany(fd);
      if (result.error) {
        const msg = typeof result.error === 'string'
          ? result.error
          : JSON.stringify(result.error);
        toast.error(msg);
        return;
      }
      toast.success('Company created! Pending admin verification.');
      router.push(`/${locale}/company/dashboard`);
      router.refresh();
    });
  };

  const handleUniversityFinish = () => {
    router.push(`/${locale}/university/dashboard`);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8 text-indigo-700 font-bold text-xl">
          <Briefcase className="h-7 w-7" />
          InternMatch ET
        </div>

        {/* Progress */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* ── STUDENT ONBOARDING ── */}
        {role === 'student' && (
          <>
            {step === 1 && (
              <Card className="shadow-lg border-0">
                <CardContent className="pt-8 pb-6 space-y-5">
                  <div className="text-center">
                    <GraduationCap className="h-10 w-10 text-indigo-600 mx-auto mb-3" />
                    <h2 className="text-xl font-bold">Welcome, {fullName}!</h2>
                    <p className="text-gray-500 text-sm mt-1">Let&apos;s set up your student profile.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Your University *</Label>
                    <select
                      value={universityId}
                      onChange={(e) => handleUniversityChange(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select your university</option>
                      {universities.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Year of Study *</Label>
                    <select
                      value={yearOfStudy}
                      onChange={(e) => setYearOfStudy(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select year</option>
                      {[1, 2, 3, 4, 5, 6, 7].map((y) => (
                        <option key={y} value={y}>Year {y}</option>
                      ))}
                    </select>
                  </div>

                  <Button
                    onClick={() => setStep(2)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={!universityId || !yearOfStudy}
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="shadow-lg border-0">
                <CardContent className="pt-8 pb-6 space-y-5">
                  <div className="text-center">
                    <h2 className="text-xl font-bold">Tell us about yourself</h2>
                    <p className="text-gray-500 text-sm mt-1">This helps companies understand who you are.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Department / Field of Study *</Label>
                    {isLoadingDepartments ? (
                      <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                        Loading departments…
                      </p>
                    ) : availableDepartments.length > 0 ? (
                      <select
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select your department</option>
                        {availableDepartments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        No departments are listed for this university yet. Please contact your
                        university coordinator to add your department before continuing.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Short Bio</Label>
                    <textarea
                      rows={3}
                      placeholder="A brief intro about yourself, your goals, interests…"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={isLoadingDepartments || !isDeptValid}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="shadow-lg border-0">
                <CardContent className="pt-8 pb-6 space-y-5 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                  <h2 className="text-xl font-bold">You&apos;re all set!</h2>
                  <p className="text-gray-500 text-sm">
                    Your profile is ready. Browse internships and start applying.
                    Complete your profile later to boost your match score.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                    <Button
                      onClick={handleStudentFinish}
                      disabled={isPending}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Go to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ── COMPANY ONBOARDING ── */}
        {role === 'company' && (
          <>
            {step === 1 && (
              <Card className="shadow-lg border-0">
                <CardContent className="pt-8 pb-6 space-y-5">
                  <div className="text-center">
                    <Building2 className="h-10 w-10 text-indigo-600 mx-auto mb-3" />
                    <h2 className="text-xl font-bold">Set up your company</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Your company needs admin verification before posting internships.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Company Name *</Label>
                    <Input
                      placeholder="e.g. iCog-Anyone Can Code"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Industry</Label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select</option>
                        {['Information Technology', 'Banking & Finance', 'Telecommunications',
                          'Healthcare', 'Education', 'NGO / Non-profit', 'Government', 'Other'].map((i) => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>City / Location *</Label>
                      <Input placeholder="e.g. Addis Ababa" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                  </div>

                  <Button
                    onClick={() => setStep(2)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={!companyName.trim() || !city.trim()}
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="shadow-lg border-0">
                <CardContent className="pt-8 pb-6 space-y-5 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                  <h2 className="text-xl font-bold">Almost there!</h2>
                  <p className="text-gray-500 text-sm">
                    Your company profile will be reviewed by the InternMatch ET team.
                    You can start exploring while you wait.
                  </p>
                  <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700 text-left">
                    📋 Upload your registration documents in Company Profile to speed up verification.
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                    <Button
                      onClick={handleCompanyFinish}
                      disabled={isPending}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Go to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ── UNIVERSITY ONBOARDING ── */}
        {role === 'university' && (
          <Card className="shadow-lg border-0">
            <CardContent className="pt-8 pb-6 space-y-5 text-center">
              <GraduationCap className="h-12 w-12 text-indigo-600 mx-auto" />
              <h2 className="text-xl font-bold">Coordinator Account</h2>
              <p className="text-gray-500 text-sm">
                After registration, choose your university or request that a new institution be added
                from your dashboard. An administrator will review the request and link your account.
              </p>
              <Button
                onClick={handleUniversityFinish}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
