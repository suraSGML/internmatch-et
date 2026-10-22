'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkillTagInput } from '@/components/shared/SkillTagInput';
import { createInternship, updateInternship } from '@/lib/actions/internships';
import { internshipSchema, type InternshipFormData } from '@/lib/validations/internships';
import { getAllowedInternshipFields } from '@/lib/matching/industryEligibility';

interface Props {
  fields: Array<{ id: string; name_en: string }>;
  industry: string | null;
  locale: string;
  mode: 'create' | 'edit';
  internship?: Record<string, unknown>;
  internshipId?: string;
}

export function InternshipForm({ fields, industry, locale, mode, internship, internshipId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('details');
  const [skills, setSkills] = useState<Array<{ name: string; level?: string }>>(
    (internship?.required_skills as Array<{ name: string; level?: string }>) ?? []
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolver = zodResolver(internshipSchema) as any;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InternshipFormData>({
    resolver,
    defaultValues: {
      title: (internship?.title as string) ?? '',
      description: (internship?.description as string) ?? '',
      requirements: (internship?.requirements as string) ?? '',
      responsibilities: (internship?.responsibilities as string) ?? '',
      field_id: (internship?.field_id as string) ?? '',
      required_department: (internship?.required_department as string) ?? '',
      required_year_min: (internship?.required_year_min as number) ?? undefined,
      location_city: (internship?.location_city as string) ?? '',
      work_mode: (internship?.work_mode as InternshipFormData['work_mode']) ?? 'on_site',
      duration_weeks: (internship?.duration_weeks as number) ?? 8,
      start_date: (internship?.start_date as string) ?? '',
      deadline: (internship?.deadline as string) ?? '',
      slots: (internship?.slots as number) ?? 1,
      is_paid: (internship?.is_paid as boolean) ?? false,
      stipend_amount: (internship?.stipend_amount as number) ?? undefined,
      benefits: (internship?.benefits as string) ?? '',
      requires_university_approval: (internship?.requires_university_approval as boolean) ?? false,
      status: (internship?.status as 'draft' | 'open') ?? 'draft',
    },
  });

  const isPaid = watch('is_paid');
  const allowedFields = new Set(getAllowedInternshipFields(industry));
  const matchingFields = fields.filter((field) =>
    allowedFields.has(field.name_en.toLocaleLowerCase())
  );

  const handleInvalidSubmit = (formErrors: FieldErrors<InternshipFormData>) => {
    if (formErrors.required_department || formErrors.required_year_min || formErrors.requirements) {
      setActiveTab('requirements');
    } else if (
      formErrors.is_paid ||
      formErrors.stipend_amount ||
      formErrors.benefits ||
      formErrors.requires_university_approval
    ) {
      setActiveTab('settings');
    } else {
      setActiveTab('details');
    }
    toast.error('Please correct the highlighted fields before continuing.');
  };

  const onSubmit = (data: InternshipFormData, asDraft = false) => {
    startTransition(async () => {
      const payload: InternshipFormData = {
        ...data,
        required_skills: skills,
        status: asDraft ? 'draft' : 'open',
      };

      const result = mode === 'create'
        ? await createInternship(payload)
        : await updateInternship(internshipId!, payload);

      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Validation error — check the form');
        return;
      }

      toast.success(
        asDraft
          ? 'Internship saved as a draft.'
          : mode === 'create'
            ? 'Internship published and now open to applications!'
            : 'Internship updated and open to applications!'
      );
      if (mode === 'create' && 'id' in result) {
        router.push(`/${locale}/company/internships`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="requirements">Requirements</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <form onSubmit={handleSubmit((d) => onSubmit(d as InternshipFormData), handleInvalidSubmit)}>
        {/* ── DETAILS ── */}
        <TabsContent value="details">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" placeholder="e.g. Junior Software Developer Intern" {...register('title')} />
                {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description *</Label>
                <textarea
                  id="description"
                  rows={5}
                  placeholder="Describe what the intern will do, your team, and what makes this a great opportunity…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  {...register('description')}
                />
                {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="responsibilities">Responsibilities</Label>
                <textarea
                  id="responsibilities"
                  rows={3}
                  placeholder="Key tasks and responsibilities…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  {...register('responsibilities')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="field_id">Field / Category *</Label>
                  <select id="field_id" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('field_id')}>
                    <option value="">Select field</option>
                  {matchingFields.map((f) => <option key={f.id} value={f.id}>{f.name_en}</option>)}
                  </select>
                  {errors.field_id && <p className="text-xs text-red-500">{errors.field_id.message}</p>}
                  <p className="text-xs text-gray-500">
                  {industry
                    ? `Fields are limited to areas related to your company’s ${industry} industry.`
                    : 'Set your company industry in your company profile before publishing.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location_city">Location / City</Label>
                  <Input id="location_city" placeholder="Addis Ababa" {...register('location_city')} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="work_mode">Work Mode</Label>
                  <select id="work_mode" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('work_mode')}>
                    <option value="on_site">On-site</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="duration_weeks">Duration (weeks) *</Label>
                  <Input id="duration_weeks" type="number" min={1} {...register('duration_weeks')} />
                  {errors.duration_weeks && <p className="text-xs text-red-500">{errors.duration_weeks.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slots">Open Slots *</Label>
                  <Input id="slots" type="number" min={1} {...register('slots')} />
                  {errors.slots && <p className="text-xs text-red-500">{errors.slots.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deadline">Deadline *</Label>
                  <Input id="deadline" type="date" {...register('deadline')} />
                  {errors.deadline && <p className="text-xs text-red-500">{errors.deadline.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" type="date" {...register('start_date')} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── REQUIREMENTS ── */}
        <TabsContent value="requirements">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Candidate Requirements</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Required Skills</Label>
                <SkillTagInput
                  value={skills}
                  onChange={setSkills}
                  placeholder="Type a skill and press Enter (e.g. Python, Excel)"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="requirements">Other Requirements</Label>
                <textarea
                  id="requirements"
                  rows={3}
                  placeholder="Any other requirements not covered by skills (e.g. CGPA, certifications)…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  {...register('requirements')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="required_department">Required Department</Label>
                  <Input id="required_department" placeholder="e.g. Computer Science, Accounting" {...register('required_department')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="required_year_min">Minimum Year of Study</Label>
                  <select id="required_year_min" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('required_year_min')}>
                    <option value="">Any year</option>
                    {[1,2,3,4,5].map((y) => <option key={y} value={y}>Year {y}+</option>)}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SETTINGS ── */}
        <TabsContent value="settings">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Compensation & Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_paid" className="h-4 w-4 rounded" {...register('is_paid')} />
                <Label htmlFor="is_paid" className="cursor-pointer font-normal">This internship is paid</Label>
              </div>

              {isPaid && (
                <div className="space-y-1.5 ml-7">
                  <Label htmlFor="stipend_amount">Monthly Stipend (ETB)</Label>
                  <Input id="stipend_amount" type="number" min={0} placeholder="e.g. 3000" {...register('stipend_amount')} />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="benefits">Benefits</Label>
                <Input id="benefits" placeholder="e.g. Transport allowance, lunch, certificate" {...register('benefits')} />
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <input type="checkbox" id="requires_university_approval" className="h-4 w-4 rounded" {...register('requires_university_approval')} />
                <div>
                  <Label htmlFor="requires_university_approval" className="cursor-pointer font-normal">
                    Require university coordinator approval
                  </Label>
                  <p className="text-xs text-gray-400">
                    A university coordinator must approve the placement before it becomes active.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Scam warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                ⚠️ <strong>Important:</strong> You must not ask students to pay any fees, registration costs, or deposits.
                Listings that request payment from students will be removed and your account suspended.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action buttons — always visible */}
        <div className="flex gap-3 mt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleSubmit(
              (d) => onSubmit(d as InternshipFormData, true),
              handleInvalidSubmit
            )}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Draft
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {mode === 'create' ? 'Publish Internship' : 'Save & Publish'}
          </Button>
        </div>
      </form>
    </Tabs>
  );
}
