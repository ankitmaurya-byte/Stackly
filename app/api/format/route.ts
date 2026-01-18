import { NextResponse } from 'next/server';
import { formatCode, isSupportedLanguage } from '@/lib/formatter';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, language } = body;

    // Validation
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required and must be a string' },
        { status: 400 }
      );
    }

    if (!language || !isSupportedLanguage(language)) {
      return NextResponse.json(
        {
          error: 'Valid language is required',
          supportedLanguages: ['javascript', 'typescript', 'json', 'html', 'css']
        },
        { status: 400 }
      );
    }

    // Format the code
    const formattedCode = await formatCode(code, language);

    return NextResponse.json({
      formattedCode,
      success: true
    });

  } catch (error) {
    console.error('Format API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to format code',
        success: false
      },
      { status: 500 }
    );
  }
}
