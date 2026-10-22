'use client';

import { useRef, useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Save, Eye, EyeOff, CheckCircle2, Edit3, GraduationCap, Camera, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileCompleteness } from '@/components/shared/ProfileCompleteness';
import { SkillTagInput } from '@/components/shared/SkillTagInput';
import { computeProfileCompleteness } from '@/lib/profileCompleteness';
import {
  updateBaseProfile,
  updateStudentProfile,
  updateStudentSkills,
  getDepartmentsByUniversity,
  uploadAvatar,
  removeAvatar,
} from '@/lib/actions/profile';

const baseSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  city: z.string().optional(),
});

const studentSchema = z.object({
  bio: z.string().max(500).optional(),
  student_number: z.string().optional(),
  expected_graduation: z.string().optional(),
  visibility: z.enum(['all_verified', 'applied_only']),
});

type BaseForm = z.infer<typeof baseSchema>;
type StudentForm = z.infer<typeof studentSchema>;

interface Props {
  profile: Record<string, unknown> | null;
  studentProfile: Record<string, unknown> | null;
  universities: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  completeness?: number;
  missingItems: string[];
  locale: string;
}

export function StudentProfileForm({
  profile,
  studentProfile,
  universities,
  departments,
  completeness: initialCompleteness,
  missingItems: initialMissingItems,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [skills, setSkills] = useState<Array<{ name: string; level?: string }>>(
    (studentProfile?.skills as Array<{ name: string; level?: string }>) ?? []
  );

  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (profile?.avatar_url as string) ?? null
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await uploadAvatar(fd);
      if (res.error) {
        toast.error(typeof res.error === 'string' ? res.error : 'Failed to upload photo');
      } else if (res.avatarUrl) {
        setAvatarUrl(res.avatarUrl);
        toast.success('Profile photo updated successfully!');
        router.refresh();
      }
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploadingPhoto(true);
    try {
      const res = await removeAvatar();
      if (res.error) {
        toast.error('Failed to remove photo');
      } else {
        setAvatarUrl(null);
        toast.success('Profile photo removed');
        router.refresh();
      }
    } catch {
      toast.error('Failed to remove photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Parse initial relational data
  const deptData = Array.isArray(studentProfile?.departments)
    ? studentProfile.departments[0]
    : (studentProfile?.departments as { id?: string; name?: string } | null);

  const uniData = Array.isArray(studentProfile?.universities)
    ? studentProfile.universities[0]
    : (studentProfile?.universities as { id?: string; name?: string } | null);

  const initialUniId = (studentProfile?.university_id as string) ?? uniData?.id ?? '';
  const initialUniName =
    uniData?.name ?? universities.find((u) => u.id === initialUniId)?.name ?? '';

  const initialDeptId = (studentProfile?.department_id as string) ?? deptData?.id ?? '';
  const initialDeptName =
    deptData?.name ?? departments.find((d) => d.id === initialDeptId)?.name ?? '';

  const initialYear =
    studentProfile?.year_of_study != null ? String(studentProfile.year_of_study) : '';

  // Controlled academic state
  const [selectedUniId, setSelectedUniId] = useState<string>(initialUniId);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    departments.some((department) => department.id === initialDeptId) ? initialDeptId : ''
  );
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [deptList, setDeptList] = useState<Array<{ id: string; name: string }>>(departments);
  const departmentRequestId = useRef(0);

  const hasSavedAcademic = Boolean(
    initialUniId || initialYear || initialDeptId || initialDeptName
  );

  const [isEditingAcademic, setIsEditingAcademic] = useState(!hasSavedAcademic);

  // Load the initial university's departments when they were not included with the page data.
  useEffect(() => {
    if (initialUniId && departments.length === 0) {
      const requestId = ++departmentRequestId.current;
      getDepartmentsByUniversity(initialUniId)
        .then((loaded) => {
          if (requestId === departmentRequestId.current) {
            setDeptList(loaded);
            setSelectedDeptId(
              loaded.some((department) => department.id === initialDeptId)
                ? initialDeptId
                : ''
            );
          }
        })
        .catch(() => {
          if (requestId === departmentRequestId.current) {
            toast.error('Could not load this university’s departments. Please try again.');
          }
        });
    }
  }, [initialUniId, initialDeptId, departments.length]);

  const baseForm = useForm<BaseForm>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      full_name: (profile?.full_name as string) ?? '',
      phone: (profile?.phone as string) ?? '',
      city: (profile?.city as string) ?? '',
    },
  });

  const studentForm = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      bio: (studentProfile?.bio as string) ?? '',
      student_number: (studentProfile?.student_number as string) ?? '',
      expected_graduation: (studentProfile?.expected_graduation as string) ?? '',
      visibility: ((studentProfile?.visibility as string) ?? 'all_verified') as
        | 'all_verified'
        | 'applied_only',
    },
  });

  // Dynamically load departments when university is changed
  const handleUniversityChange = async (newUniId: string, departmentToRestore = '') => {
    const requestId = ++departmentRequestId.current;
    setSelectedUniId(newUniId);
    setSelectedDeptId('');
    setDeptList([]);
    if (newUniId) {
      try {
        const loaded = await getDepartmentsByUniversity(newUniId);
        if (requestId === departmentRequestId.current) {
          setDeptList(loaded);
          setSelectedDeptId(
            loaded.some((department) => department.id === departmentToRestore)
              ? departmentToRestore
              : ''
          );
        }
      } catch {
        if (requestId === departmentRequestId.current) {
          toast.error('Could not load this university’s departments. Please try again.');
        }
      }
    }
  };

  const handleBaseSubmit = (data: BaseForm) => {
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => v && fd.append(k, v));
      const result = await updateBaseProfile(fd);
      if (result.error) {
        toast.error('Failed to save profile');
      } else {
        toast.success('Profile updated');
        router.refresh();
      }
    });
  };

  const handleAcademicSubmit = (data: StudentForm) => {
    if (!hasSavedAcademic) {
      if (!selectedUniId) {
        toast.error('Please select your university');
        return;
      }
      if (!selectedYear) {
        toast.error('Please select your year of study');
        return;
      }
      if (!deptList.some((department) => department.id === selectedDeptId)) {
        toast.error(
          deptList.length
            ? 'Please select a department listed for your university'
            : 'No departments are listed for this university yet. Contact your university coordinator.'
        );
        return;
      }
    }

    startTransition(async () => {
      const fd = new FormData();
      if (!hasSavedAcademic) {
        fd.append('university_id', selectedUniId);
        fd.append('year_of_study', selectedYear);
        fd.append('department_id', selectedDeptId);
      }

      if (data.bio) fd.append('bio', data.bio);
      if (data.student_number) fd.append('student_number', data.student_number);
      if (data.expected_graduation) fd.append('expected_graduation', data.expected_graduation);
      if (data.visibility) fd.append('visibility', data.visibility);

      const result = await updateStudentProfile(fd);
      if (result.error) {
        const msg =
          typeof result.error === 'string'
            ? result.error
            : 'Failed to save academic details';
        toast.error(msg);
      } else {
        toast.success('Academic details saved successfully!');
        setIsEditingAcademic(false);
        router.refresh();
      }
    });
  };

  const handleSkillsSave = () => {
    startTransition(async () => {
      const userId = (profile?.id as string) || (studentProfile?.user_id as string);
      const normalized = skills.map((s) => ({
        name: s.name,
        level: s.level ?? 'intermediate',
      }));
      const result = await updateStudentSkills(userId, normalized);
      if (result.error) {
        toast.error('Failed to save skills');
      } else {
        toast.success('Skills saved');
        router.refresh();
      }
    });
  };

  // Live profile completeness
  const activeUniId = selectedUniId || initialUniId;
  const activeDept = selectedDeptId || initialDeptId;
  const activeYear = selectedYear || initialYear;
  const activeFullName = baseForm.watch('full_name') || (profile?.full_name as string);
  const activePhone = baseForm.watch('phone') || (profile?.phone as string);
  const activeCity = baseForm.watch('city') || (profile?.city as string);
  const activeBio = studentForm.watch('bio') || (studentProfile?.bio as string);

  const { percentage: completeness, missingItems } = computeProfileCompleteness({
    fullName: activeFullName,
    phone: activePhone,
    city: activeCity,
    avatarUrl: avatarUrl,
    bio: activeBio,
    skills,
    universityId: activeUniId,
    departmentId: activeDept,
    yearOfStudy: activeYear,
    cvUrl: studentProfile?.cv_url as string | undefined,
  });

  const displayUniName =
    universities.find((u) => u.id === selectedUniId)?.name ||
    initialUniName ||
    'Selected';

  const displayDeptName =
    deptList.find((d) => d.id === selectedDeptId)?.name || initialDeptName || 'Not specified';

  return (
    <div className="space-y-6">
      {/* Completeness card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <ProfileCompleteness
            percentage={completeness}
            missingItems={missingItems}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        {/* ── Basic Info ── */}
        <TabsContent value="basic">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Photo Upload Section */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                <div className="relative group">
                  <Avatar className="h-20 w-20 border-2 border-white shadow-sm ring-2 ring-gray-100">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={activeFullName || 'User'} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="text-lg font-bold bg-indigo-100 text-indigo-700">
                      {(activeFullName || 'S')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Profile Photo</h4>
                    <p className="text-xs text-gray-500">
                      Upload a clean, professional headshot (JPG, PNG, or WEBP, max 5MB).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <Label
                      htmlFor="avatar-file-upload"
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                    </Label>
                    <input
                      id="avatar-file-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingPhoto}
                      onChange={handlePhotoUpload}
                    />
                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isUploadingPhoto}
                        onClick={handleRemovePhoto}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2.5"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <form onSubmit={baseForm.handleSubmit(handleBaseSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input id="full_name" {...baseForm.register('full_name')} />
                  {baseForm.formState.errors.full_name && (
                    <p className="text-xs text-red-500">
                      {baseForm.formState.errors.full_name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone (+251…)</Label>
                    <Input id="phone" placeholder="+251911000000" {...baseForm.register('phone')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="Addis Ababa" {...baseForm.register('city')} />
                  </div>
                </div>

                <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Academic Info ── */}
        <TabsContent value="academic">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-600" />
                Academic Details
              </CardTitle>
              {hasSavedAcademic && !isEditingAcademic && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingAcademic(true)}
                  className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                >
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                  Edit Other Details
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Confirmed Academic Info Card when already saved */}
              {hasSavedAcademic && !isEditingAcademic ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-green-200 bg-green-50/60 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>Academic Information (Saved)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="bg-white p-3 rounded-lg border border-green-100 shadow-2xs">
                        <p className="text-xs text-gray-500 font-medium">University</p>
                        <p className="font-semibold text-gray-900 mt-0.5">{displayUniName}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-100 shadow-2xs">
                        <p className="text-xs text-gray-500 font-medium">Department</p>
                        <p className="font-semibold text-gray-900 mt-0.5">{displayDeptName}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-100 shadow-2xs">
                        <p className="text-xs text-gray-500 font-medium">Year of Study</p>
                        <p className="font-semibold text-gray-900 mt-0.5">
                          {selectedYear || initialYear
                            ? `Year ${selectedYear || initialYear}`
                            : 'Not specified'}
                        </p>
                      </div>
                    </div>

                    {(Boolean(studentProfile?.student_number) ||
                      Boolean(studentProfile?.expected_graduation)) && (
                      <div className="flex flex-wrap gap-4 text-xs text-gray-600 pt-1 border-t border-green-100/70">
                        {Boolean(studentProfile?.student_number) && (
                          <span>
                            Student ID:{' '}
                            <strong className="text-gray-900">
                              {String(studentProfile?.student_number)}
                            </strong>
                          </span>
                        )}
                        {Boolean(studentProfile?.expected_graduation) && (
                          <span>
                            Expected Graduation:{' '}
                            <strong className="text-gray-900">
                              {String(studentProfile?.expected_graduation)}
                            </strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {Boolean(studentProfile?.bio) && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
                      <p className="text-xs text-gray-500 font-medium">Bio</p>
                      <p className="text-sm text-gray-800">{String(studentProfile?.bio)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={studentForm.handleSubmit(handleAcademicSubmit)}
                  className="space-y-4"
                >
                  {hasSavedAcademic && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                      University, department, and year of study are fixed. Contact your university
                      coordinator if any of these details need correction.
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      rows={3}
                      placeholder="Tell companies about yourself, your interests and goals…"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      {...studentForm.register('bio')}
                    />
                    <p className="text-xs text-gray-400">Max 500 characters</p>
                  </div>

                  {!hasSavedAcademic && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="university_id">University *</Label>
                        <select
                          id="university_id"
                          value={selectedUniId}
                          onChange={(e) => handleUniversityChange(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select university</option>
                          {universities.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="department_id">Department *</Label>
                        <select
                          id="department_id"
                          value={selectedDeptId}
                          onChange={(e) => setSelectedDeptId(e.target.value)}
                          disabled={!deptList.length}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select department</option>
                          {deptList.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        {!deptList.length && (
                          <p className="text-xs text-amber-700">
                            No departments are listed for this university yet. Contact your university coordinator.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`grid grid-cols-1 gap-4 ${hasSavedAcademic ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                    <div className="space-y-1.5">
                      <Label htmlFor="student_number">Student ID</Label>
                      <Input
                        id="student_number"
                        placeholder="ETS0123/12"
                        {...studentForm.register('student_number')}
                      />
                    </div>
                    {!hasSavedAcademic && (
                      <div className="space-y-1.5">
                        <Label htmlFor="year_of_study">Year of Study *</Label>
                        <select
                          id="year_of_study"
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select year</option>
                          {[1, 2, 3, 4, 5, 6, 7].map((y) => (
                            <option key={y} value={String(y)}>
                              Year {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="expected_graduation">Expected Graduation</Label>
                      <Input
                        id="expected_graduation"
                        type="date"
                        {...studentForm.register('expected_graduation')}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Profile Visibility</Label>
                    <div className="flex flex-col gap-2">
                      {(['all_verified', 'applied_only'] as const).map((opt) => (
                        <label key={opt} className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            value={opt}
                            className="mt-0.5"
                            {...studentForm.register('visibility')}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {opt === 'all_verified' ? (
                                <span className="flex items-center gap-1">
                                  <Eye className="h-4 w-4" /> Visible to all verified companies
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <EyeOff className="h-4 w-4" /> Only companies I apply to
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">
                              {opt === 'all_verified'
                                ? 'Any verified company can discover your profile.'
                                : 'Your profile is private until you apply.'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Profile Details
                    </Button>
                    {hasSavedAcademic && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void handleUniversityChange(initialUniId, initialDeptId);
                          setSelectedYear(initialYear);
                          setIsEditingAcademic(false);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Skills ── */}
        <TabsContent value="skills">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SkillTagInput
                value={skills}
                onChange={setSkills}
                placeholder="Type a skill and press Enter (e.g. Python, Excel…)"
              />
              <Button
                type="button"
                onClick={handleSkillsSave}
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Skills
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
