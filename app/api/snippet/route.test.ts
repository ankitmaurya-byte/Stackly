import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: { codeSnippet: { create: (args: unknown) => createMock(args) } },
}));

import { POST } from './route';

function jsonRequest(body: unknown): Request {
  return new Request('http://test/api/snippet', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/snippet', () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'abc123', ...data }),
    );
  });

  it('persists a valid snippet with channelSlug', async () => {
    const res = await POST(
      jsonRequest({
        language: 'typescript',
        rawCode: 'const x = 1',
        formattedCode: 'const x = 1;\n',
        channelSlug: 'typescript',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.url).toBe('/c/abc123');
    expect(createMock).toHaveBeenCalledWith({
      data: {
        language: 'typescript',
        rawCode: 'const x = 1',
        formattedCode: 'const x = 1;\n',
        channelSlug: 'typescript',
      },
    });
  });

  it('falls back to "general" when channelSlug is missing', async () => {
    const res = await POST(
      jsonRequest({
        language: 'javascript',
        rawCode: 'x',
        formattedCode: 'x',
      }),
    );
    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ channelSlug: 'general' }),
    });
  });

  it('falls back to "general" when channelSlug is invalid', async () => {
    const res = await POST(
      jsonRequest({
        language: 'javascript',
        rawCode: 'x',
        formattedCode: 'x',
        channelSlug: 'not-real',
      }),
    );
    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ channelSlug: 'general' }),
    });
  });

  it('accepts python as a storable language (non-formatter channel)', async () => {
    const res = await POST(
      jsonRequest({
        language: 'python',
        rawCode: 'print(1)',
        formattedCode: 'print(1)',
        channelSlug: 'python',
      }),
    );
    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ language: 'python', channelSlug: 'python' }),
    });
  });

  it('rejects an unknown language', async () => {
    const res = await POST(
      jsonRequest({
        language: 'cobol',
        rawCode: 'x',
        formattedCode: 'x',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects missing rawCode', async () => {
    const res = await POST(
      jsonRequest({
        language: 'javascript',
        formattedCode: 'x',
      }),
    );
    expect(res.status).toBe(400);
  });
});
