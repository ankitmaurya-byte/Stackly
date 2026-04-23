import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isSupportedLanguage } from '@/lib/formatter';
import {
  isValidChannelSlug,
  CHANNEL_SLUGS,
  type ChannelSlug,
} from '@/lib/channels';

const STORABLE_LANGUAGES = new Set<string>([
  'javascript',
  'typescript',
  'json',
  'html',
  'css',
  // Non-formatter languages accepted for storage only.
  'python',
  'rust',
  'sql',
  'general',
  'react',
]);

function isStorableLanguage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (STORABLE_LANGUAGES.has(value) || isSupportedLanguage(value))
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { language, rawCode, formattedCode, channelSlug } = body;

    if (!isStorableLanguage(language)) {
      return NextResponse.json(
        {
          error: 'Valid language is required',
          supportedLanguages: Array.from(STORABLE_LANGUAGES),
        },
        { status: 400 },
      );
    }

    if (!rawCode || typeof rawCode !== 'string') {
      return NextResponse.json(
        { error: 'Raw code is required and must be a string' },
        { status: 400 },
      );
    }

    if (!formattedCode || typeof formattedCode !== 'string') {
      return NextResponse.json(
        { error: 'Formatted code is required and must be a string' },
        { status: 400 },
      );
    }

    let resolvedSlug: ChannelSlug = 'general';
    if (channelSlug !== undefined) {
      if (isValidChannelSlug(channelSlug)) {
        resolvedSlug = channelSlug;
      } else {
        console.warn(
          `[snippet] invalid channelSlug rejected, falling back to general: ${String(channelSlug)}`,
        );
      }
    }

    const snippet = await prisma.codeSnippet.create({
      data: {
        language,
        rawCode,
        formattedCode,
        channelSlug: resolvedSlug,
      },
    });

    return NextResponse.json({
      id: snippet.id,
      success: true,
      url: `/c/${snippet.id}`,
      channelSlug: resolvedSlug,
      validChannelSlugs: CHANNEL_SLUGS,
    });
  } catch (error) {
    console.error('Create snippet API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create snippet',
        success: false,
      },
      { status: 500 },
    );
  }
}
