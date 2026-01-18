import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Snippet ID is required' },
        { status: 400 }
      );
    }

    // Fetch snippet from database
    const snippet = await prisma.codeSnippet.findUnique({
      where: { id },
    });

    if (!snippet) {
      return NextResponse.json(
        { error: 'Snippet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      snippet,
      success: true,
    });

  } catch (error) {
    console.error('Get snippet API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch snippet',
        success: false
      },
      { status: 500 }
    );
  }
}
