import { notFound } from 'next/navigation';
import { highlightCode } from '@/lib/highlighter';
import CopyButton from '@/components/CopyButton';
import type { SupportedLanguage } from '@/lib/formatter';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getSnippet(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/snippet/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.snippet;
  } catch (error) {
    console.error('Error fetching snippet:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const snippet = await getSnippet(id);

  if (!snippet) {
    return {
      title: 'Snippet Not Found - CodeShare',
    };
  }

  return {
    title: `${snippet.language.toUpperCase()} Snippet - CodeShare`,
    description: `View and copy this ${snippet.language} code snippet`,
  };
}

export default async function SnippetPage({ params }: PageProps) {
  const { id } = await params;
  const snippet = await getSnippet(id);

  if (!snippet) {
    notFound();
  }

  // Highlight the formatted code
  const highlightedHtml = await highlightCode(
    snippet.formattedCode,
    snippet.language as SupportedLanguage
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <a href="/" className="text-3xl font-bold text-white hover:text-blue-400 transition-colors">
                Code<span className="text-blue-500">Share</span>
              </a>
              <p className="text-gray-400 mt-1">Shared code snippet</p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create New Snippet
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {/* Snippet Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-blue-900/50 border border-blue-700 text-blue-300 rounded-lg text-sm font-medium uppercase">
                {snippet.language}
              </span>
              <span className="text-gray-400 text-sm">
                Created {new Date(snippet.createdAt).toLocaleDateString()}
              </span>
            </div>
            <CopyButton code={snippet.formattedCode} />
          </div>

          {/* Code Display */}
          <div className="rounded-lg overflow-hidden border border-gray-700 bg-gray-950">
            <div
              className="syntax-highlighted"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </div>

          {/* Actions */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Actions</h3>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share URL
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
