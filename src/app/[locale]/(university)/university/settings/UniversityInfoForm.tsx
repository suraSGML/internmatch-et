'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateUniversitySettings } from '@/lib/actions/university';

interface Props {
  universityId: string;
  universityName: string;
  universityStatus: string;
  memberRole: string;
  letterhead: { header_text?: string; footer_text?: string; accent_color?: string } | null;
}

export function UniversityInfoForm({ universityId, universityName, universityStatus: _universityStatus, memberRole, letterhead }: Props) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [headerText, setHeaderText] = useState(letterhead?.header_text ?? '');
  const [footerText, setFooterText] = useState(letterhead?.footer_text ?? '');
  const [accentColor, setAccentColor] = useState(letterhead?.accent_color ?? '#4f46e5');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const result = await updateUniversitySettings(universityId, {
      header_text: headerText,
      footer_text: footerText,
      accent_color: accentColor,
    });
    setSaving(false);
    if (result.error) {
      setMessage({ type: 'error', text: typeof result.error === 'string' ? result.error : 'Failed to save.' });
    } else {
      setMessage({ type: 'success', text: 'Settings saved.' });
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-500 text-xs mb-1">University Name</p>
          <p className="font-medium">{universityName}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Your Role</p>
          <p className="font-medium capitalize">{memberRole || 'coordinator'}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="header_text" className="text-xs text-gray-600">Letterhead Header Text</Label>
          <Input
            id="header_text"
            value={headerText}
            onChange={e => setHeaderText(e.target.value)}
            placeholder="e.g. Addis Ababa University — Office of Student Affairs"
          />
        </div>
        <div>
          <Label htmlFor="footer_text" className="text-xs text-gray-600">Letterhead Footer Text</Label>
          <Textarea
            id="footer_text"
            value={footerText}
            onChange={e => setFooterText(e.target.value)}
            placeholder="e.g. This letter is issued by the authorized coordinator..."
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="accent_color" className="text-xs text-gray-600">Accent Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="accent_color"
              value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
              className="h-9 w-14 rounded border border-gray-300 cursor-pointer"
            />
            <span className="text-sm text-gray-500 font-mono">{accentColor}</span>
          </div>
        </div>
        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}
        <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {saving ? 'Saving...' : 'Save Letterhead Settings'}
        </Button>
      </form>
    </div>
  );
}
