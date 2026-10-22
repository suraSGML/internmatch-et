'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateBaseProfile } from '@/lib/actions/profile';

interface Props {
  fullName: string;
  phone: string;
  city: string;
}

export function ProfileSettingsForm({ fullName, phone, city }: Props) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    const result = await updateBaseProfile(formData);
    setSaving(false);
    if (result.error) {
      setMessage({ type: 'error', text: typeof result.error === 'string' ? result.error : 'Failed to save.' });
    } else {
      setMessage({ type: 'success', text: 'Profile updated.' });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="full_name" className="text-xs text-gray-600">Full Name</Label>
        <Input id="full_name" name="full_name" defaultValue={fullName} required />
      </div>
      <div>
        <Label htmlFor="phone" className="text-xs text-gray-600">Phone</Label>
        <Input id="phone" name="phone" defaultValue={phone} type="tel" />
      </div>
      <div>
        <Label htmlFor="city" className="text-xs text-gray-600">City</Label>
        <Input id="city" name="city" defaultValue={city} />
      </div>
      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
      <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
        {saving ? 'Saving...' : 'Update Profile'}
      </Button>
    </form>
  );
}
