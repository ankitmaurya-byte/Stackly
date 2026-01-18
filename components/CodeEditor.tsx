'use client';

import { Editor } from '@monaco-editor/react';
// import type { SupportedLanguage } from '@/lib/formatter';
type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'html'
  | 'css'
  | 'python'
  | 'java'
  | 'cpp'
  | 'c'
  | 'go'
  | 'rust'
  | 'markdown';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: SupportedLanguage;
  readOnly?: boolean;
}

export default function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
}: CodeEditorProps) {
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <Editor
        height="500px"
        language={language}
        value={value}
        onChange={(newValue) => onChange(newValue || '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          readOnly,
          padding: { top: 16, bottom: 16 },
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}
      />
    </div>
  );
}
