'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Save, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { updateCompanyProfile, createCompany } from '@/lib/actions/profile';

const schema = z.object({
  name: z.string().min(2, 'Company name is required'),
  description: z.string().max(1000).optional(),
  industry: z.string().optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url('Enter a valid URL (https://...)').optional().or(z.literal('')),
  contact_person: z.string().optional(),
  registration_number: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const INDUSTRIES = [
  'Information Technology', 'Banking & Finance', 'Telecommunications',
  'Healthcare', 'Education', 'Manufacturing', 'Agriculture', 'NGO / Non-profit',
  'Government', 'Retail & E-commerce', 'Media & Communications', 'Other',
];

interface Props {
  company: Record<string, unknown> | null;
  memberRole: string;
  userId: string;
}

export function CompanyProfileForm({ company, memberRole }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isOwner = memberRole === 'owner';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: (company?.name as string) ?? '',
      description: (company?.description as string) ?? '',
      industry: (company?.industry as string) ?? '',
      size: (company?.size as FormData['size']) ?? undefined,
      city: (company?.city as string) ?? '',
      address: (company?.address as string) ?? '',
      website: (company?.website as string) ?? '',
      contact_person: (company?.contact_person as string) ?? '',
      registration_number: (company?.registration_number as string) ?? '',
    },
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => v != null && fd.append(k, String(v)));

      const result = company
        ? await updateCompanyProfile(company.id as string, fd)
        : await createCompany(fd);

      if (result.error) toast.error(typeof result.error === 'string' ? result.error : 'Validation error');
      else {
        toast.success(company ? 'Company profile updated' : 'Company created — pending verification');
        router.refresh();
      }
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-indigo-600" />
          {company ? 'Edit Company Profile' : 'Create Your Company Profile'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Name + industry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                placeholder="iCog-Anyone Can Code"
                disabled={!isOwner}
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <select
                id="industry"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!isOwner}
                {...register('industry')}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Company Description</Label>
            <textarea
              id="description"
              rows={4}
              placeholder="Describe your company, mission, and culture…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              disabled={!isOwner}
              {...register('description')}
            />
          </div>

          {/* Size + city */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="size">Company Size</Label>
              <select
                id="size"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!isOwner}
                {...register('size')}
              >
                <option value="">Select size</option>
                {['1-10', '11-50', '51-200', '201-500', '500+'].map((s) => (
                  <option key={s} value={s}>{s} employees</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="Addis Ababa" disabled={!isOwner} {...register('city')} />
            </div>
          </div>

          {/* Address + website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="Bole Road, Addis Ababa" disabled={!isOwner} {...register('address')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" placeholder="https://yourcompany.et" disabled={!isOwner} {...register('website')} />
              {errors.website && <p className="text-xs text-red-500">{errors.website.message}</p>}
            </div>
          </div>

          <Separator />

          {/* Verification fields */}
          <div className="space-y-1 mb-2">
            <p className="text-sm font-medium text-gray-700">Verification Details</p>
            <p className="text-xs text-gray-400">Required for admin verification. Not shown publicly.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input id="contact_person" placeholder="HR Manager name" disabled={!isOwner} {...register('contact_person')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="registration_number">Registration / TIN Number</Label>
              <Input id="registration_number" placeholder="000-000-000" disabled={!isOwner} {...register('registration_number')} />
            </div>
          </div>

          {isOwner && (
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {company ? 'Save Changes' : 'Create Company'}
            </Button>
          )}

          {!isOwner && (
            <p className="text-sm text-gray-400">Only the company owner can edit this profile.</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
