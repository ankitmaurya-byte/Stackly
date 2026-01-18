'use client';

import type { SupportedLanguage } from '@/lib/formatter';

interface LanguageSelectorProps {
  value: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void;
}

const languages: { value: SupportedLanguage; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
];

export default function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language" className="text-sm font-medium text-gray-300">
        Language:
      </label>
      <select
        id="language"
        value={value}
        onChange={(e) => onChange(e.target.value as SupportedLanguage)}
        className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
      >
        {languages.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
