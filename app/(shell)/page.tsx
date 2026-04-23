'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import LanguageSelector from '@/components/LanguageSelector';
import ChannelPicker from '@/components/ChannelPicker';
import type { SupportedLanguage } from '@/lib/formatter';
import { isSupportedLanguage } from '@/lib/formatter';
import {
  type ChannelSlug,
  channelForParser,
  getChannel,
  isValidChannelSlug,
} from '@/lib/channels';
import { LOAD_SAMPLE_EVENT, type LoadSampleDetail } from '@/lib/samples';

type EditorLanguage = SupportedLanguage | 'python' | 'rust' | 'sql' | 'react';

const languageToParser: Record<string, string | null> = {
  javascript: 'babel',
  typescript: 'typescript',
  json: 'json',
  html: 'html',
  css: 'css',
  react: 'babel',
  python: null,
  rust: null,
  sql: null,
};

export default function Home() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<EditorLanguage>('javascript');
  const [channelSlug, setChannelSlug] = useState<ChannelSlug>('javascript');
  const [isFormatting, setIsFormatting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  const channelUserSetRef = useRef(false);

  const handleLanguageChange = useCallback((next: SupportedLanguage) => {
    setLanguage(next);
    if (!channelUserSetRef.current) {
      const parser = languageToParser[next] ?? null;
      setChannelSlug(channelForParser(parser));
    }
  }, []);

  const handleChannelChange = useCallback((slug: ChannelSlug) => {
    channelUserSetRef.current = true;
    setChannelSlug(slug);
    const ch = getChannel(slug);
    if (ch && ch.slug !== 'general') {
      setLanguage(ch.slug as EditorLanguage);
    }
  }, []);

  useEffect(() => {
    function onSample(event: Event) {
      const detail = (event as CustomEvent<LoadSampleDetail>).detail;
      if (!detail || typeof detail.code !== 'string' || !isValidChannelSlug(detail.slug)) return;

      if (code.trim() && code !== detail.code) {
        const ok = window.confirm('Replace current code?');
        if (!ok) return;
      }

      channelUserSetRef.current = true;
      setCode(detail.code);
      setChannelSlug(detail.slug);
      if (detail.slug !== 'general') {
        setLanguage(detail.slug as EditorLanguage);
      }
    }

    window.addEventListener(LOAD_SAMPLE_EVENT, onSample);
    return () => window.removeEventListener(LOAD_SAMPLE_EVENT, onSample);
  }, [code]);

  const canFormat = useMemo(
    () => isSupportedLanguage(language as string),
    [language],
  );

  const handleFormat = async () => {
    if (!code.trim()) {
      setError('Please enter some code to format');
      return;
    }
    if (!canFormat) {
      setError(`Formatting is not supported for ${language}`);
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
      let formattedCode = code;
      if (canFormat) {
        const formatResponse = await fetch('/api/format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language }),
        });
        const formatData = await formatResponse.json();
        formattedCode = formatData.success ? formatData.formattedCode : code;
      }

      const snippetResponse = await fetch('/api/snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          rawCode: code,
          formattedCode,
          channelSlug,
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
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">
          <span className="text-[var(--color-accent)]">S</span>tackly
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Format and share code snippets across channels.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <LanguageSelector
            value={language as SupportedLanguage}
            onChange={handleLanguageChange}
          />
          <ChannelPicker value={channelSlug} onChange={handleChannelChange} />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleFormat}
            disabled={isFormatting || !code.trim() || !canFormat}
            className="rounded-full bg-[var(--color-bg-mid)] px-4 py-2 text-sm font-bold uppercase tracking-[1.4px] text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-card)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFormatting ? 'Formatting…' : 'Format'}
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing || !code.trim()}
            className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-bold uppercase tracking-[1.4px] text-black transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSharing ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-[#f3727f]/30 bg-[#f3727f]/10 px-4 py-3 text-sm text-[#f3727f]">
          {error}
        </div>
      )}

      {shareUrl && (
        <div className="rounded border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-4 py-3 text-sm text-[var(--color-text)]">
          <p className="mb-2 font-bold">Snippet shared.</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 rounded bg-[var(--color-bg-mid)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="rounded-full bg-[var(--color-bg-mid)] px-4 py-2 text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <CodeEditor
        value={code}
        onChange={setCode}
        language={language as SupportedLanguage}
      />
    </div>
  );
}
