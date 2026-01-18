'use client';

import { useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import LanguageSelector from '@/components/LanguageSelector';
import type { SupportedLanguage } from '@/lib/formatter';

export default function Home() {
  const [code, setCode] = useState('dsgdsfv');
  const [language, setLanguage] = useState<SupportedLanguage>('javascript');
  const [isFormatting, setIsFormatting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  const handleFormat = async () => {
    if (!code.trim()) {
      setError('Please enter some code to format');
      return;
    }

    setError('');
    setIsFormatting(true);

    try {
      const response = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to format code');
      }

      setCode(data.formattedCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsFormatting(false);
    }
  };

  const handleShare = async () => {
    if (!code.trim()) {
      setError('Please enter some code to share');
      return;
    }

    setError('');
    setShareUrl('');
    setIsSharing(true);

    try {
      // First format the code
      const formatResponse = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });

      const formatData = await formatResponse.json();
      const formattedCode = formatData.success ? formatData.formattedCode : code;

      // Then create the snippet
      const snippetResponse = await fetch('/api/snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          rawCode: code,
          formattedCode,
        }),
      });

      const snippetData = await snippetResponse.json();

      if (!snippetResponse.ok || !snippetData.success) {
        throw new Error(snippetData.error || 'Failed to create snippet');
      }

      const fullUrl = `${window.location.origin}${snippetData.url}`;
      setShareUrl(fullUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-white">
            Code<span className="text-blue-500">Share</span>
          </h1>
          <p className="text-gray-400 mt-1">Format and share your code snippets</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <LanguageSelector value={language} onChange={setLanguage} />

            <div className="flex gap-3">
              <button
                onClick={handleFormat}
                disabled={isFormatting || !code.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isFormatting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Formatting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Format Code
                  </>
                )}
              </button>

              <button
                onClick={handleShare}
                disabled={isSharing || !code.trim()}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isSharing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sharing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success Message with Share URL */}
          {shareUrl && (
            <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg">
              <p className="font-medium mb-2">Snippet shared successfully!</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                  }}
                  className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded transition-colors"
                >
                  Copy URL
                </button>
              </div>
            </div>
          )}

          {/* Code Editor */}
          <div>
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
            />
          </div>

          {/* Tips */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Tips</h3>
            <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
              <li>Paste your code in the editor above</li>
              <li>Select the appropriate language from the dropdown</li>
              <li>Click "Format Code" to prettify your code</li>
              <li>Click "Share" to generate a shareable link</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
