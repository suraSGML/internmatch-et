'use client';

import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SkillTag {
  name: string;
  level?: string;
}

interface SkillTagInputProps {
  value: SkillTag[];
  onChange: (skills: SkillTag[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

const LEVELS = ['beginner', 'intermediate', 'advanced'];

const LEVEL_COLORS: Record<string, string> = {
  beginner:     'bg-blue-50 text-blue-700 border-blue-200',
  intermediate: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  advanced:     'bg-purple-50 text-purple-700 border-purple-200',
};

export function SkillTagInput({
  value,
  onChange,
  placeholder = 'Add a skill and press Enter',
  maxTags = 20,
  className,
}: SkillTagInputProps) {
  const [input, setInput] = useState('');

  const addSkill = () => {
    const trimmed = input.trim();
    if (!trimmed || value.length >= maxTags) return;
    if (value.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setInput('');
      return;
    }
    onChange([...value, { name: trimmed, level: 'intermediate' }]);
    setInput('');
  };

  const removeSkill = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const cycleLevel = (index: number) => {
    const current = value[index].level ?? 'intermediate';
    const next = LEVELS[(LEVELS.indexOf(current) + 1) % LEVELS.length];
    const updated = [...value];
    updated[index] = { ...updated[index], level: next };
    onChange(updated);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill();
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeSkill(value.length - 1);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2 p-2 min-h-[44px] border rounded-lg bg-white focus-within:ring-2 focus-within:ring-ring">
        {value.map((skill, i) => (
          <Badge
            key={`${skill.name}-${i}`}
            variant="outline"
            className={cn(
              'flex items-center gap-1 cursor-pointer select-none',
              LEVEL_COLORS[skill.level ?? 'intermediate']
            )}
          >
            <button
              type="button"
              onClick={() => cycleLevel(i)}
              className="hover:underline text-xs font-medium"
              title={`Level: ${skill.level} — click to cycle`}
            >
              {skill.name}
            </button>
            <span className="text-xs opacity-60">({skill.level?.slice(0, 3)})</span>
            <button
              type="button"
              onClick={() => removeSkill(i)}
              className="ml-0.5 hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent placeholder:text-gray-400"
          disabled={value.length >= maxTags}
        />
      </div>
      <p className="text-xs text-gray-400">
        Press Enter to add. Click a skill to cycle level (beginner → intermediate → advanced).
        {maxTags && ` Max ${maxTags} skills.`}
      </p>
    </div>
  );
}
