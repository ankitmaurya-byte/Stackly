import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isSupportedLanguage } from '@/lib/formatter';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { language, rawCode, formattedCode } = body;

    // Validation
    if (!language || !isSupportedLanguage(language)) {
      return NextResponse.json(
        {
          error: 'Valid language is required',
          supportedLanguages: ['javascript', 'typescript', 'json', 'html', 'css']
        },
        { status: 400 }
      );
    }

    if (!rawCode || typeof rawCode !== 'string') {
      return NextResponse.json(
        { error: 'Raw code is required and must be a string' },
        { status: 400 }
      );
    }

    if (!formattedCode || typeof formattedCode !== 'string') {
      return NextResponse.json(
        { error: 'Formatted code is required and must be a string' },
        { status: 400 }
      );
    }

    // Create snippet in database
    const snippet = await prisma.codeSnippet.create({
      data: {
        language,
        rawCode,
        formattedCode,
      },
    });

    return NextResponse.json({
      id: snippet.id,
      success: true,
      url: `/c/${snippet.id}`,
    });

  } catch (error) {
    console.error('Create snippet API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create snippet',
        success: false
      },
      { status: 500 }
    );
  }
}
