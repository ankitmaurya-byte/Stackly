# Channels Sidebar + Marquee Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Spotify-style left sidebar with a fixed channel list and a moving top marquee of curated code samples. Snippets can be tagged with a channel slug; visiting `/channel/[slug]` browses that channel's recent snippets. The focused read page `/c/[id]` stays shell-free.

**Architecture:** Next.js App Router route group `(shell)` provides the shared sidebar + marquee for home and channel pages. Channels are hardcoded in `lib/channels.ts` (no `Channel` table). One nullable `channelSlug` column on `CodeSnippet`. Samples are hardcoded in `lib/samples.ts` and loaded into the editor via a `CustomEvent` dispatched from `Marquee`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7 (Postgres), Tailwind v4, Prettier 3, Shiki, Monaco Editor, Vitest (new).

**Spec:** `docs/superpowers/specs/2026-04-23-channels-marquee-design.md`

---

## File Structure

### Create
- `vitest.config.ts` — test runner config
- `lib/channels.ts` — channel constants + helpers
- `lib/channels.test.ts` — unit tests
- `lib/samples.ts` — curated marquee samples
- `components/Sidebar.tsx` — server component, left navigation shell
- `components/SidebarNav.tsx` — client sub-component, active-link detection
- `components/Marquee.tsx` — client component, infinite scroll of sample pills
- `components/ChannelPicker.tsx` — client dropdown bound to home editor
- `components/SnippetCard.tsx` — server component, channel grid cell
- `app/(shell)/layout.tsx` — route-group shell (sidebar + marquee + main)
- `app/(shell)/channel/[slug]/page.tsx` — channel browse page
- `app/api/snippet/route.test.ts` — API unit test
- `prisma/migrations/<timestamp>_add_channel_slug/migration.sql` — generated

### Modify
- `package.json` — add vitest + @vitejs/plugin-react + jsdom + @testing-library + related devDeps; add `test` script
- `prisma/schema.prisma` — add `channelSlug` field + compound index on `CodeSnippet`
- `app/layout.tsx` — update `Metadata` title/description to Stackly, switch bg to `#121212`
- `app/globals.css` — replace palette with Spotify tokens, add marquee keyframes and reduced-motion override
- `app/api/snippet/route.ts` — accept optional `channelSlug`, validate, persist
- `lib/formatter.ts` — no change needed (stays the 5-parser subset); API just allows a broader set of storable languages
- `app/page.tsx` — **delete** (moved to `app/(shell)/page.tsx`)

### Create by moving
- `app/(shell)/page.tsx` — new home that mounts `ChannelPicker`, listens for `stackly:load-sample`, posts `channelSlug` on share. Restyled to use design tokens and the Share/Format controls kept.

---

## Notes for the engineer

- The existing model is `CodeSnippet` with fields `id`, `language`, `rawCode`, `formattedCode`, `createdAt`. Do not rename it.
- `formatter.ts` exports `SupportedLanguage` (the 5 Prettier parsers). Channel slugs are a **superset** (adds `general`, `react`, `sql`, `python`, `rust`). The API must accept any `ChannelSlug` in `language` OR any `SupportedLanguage` — this plan widens API validation to the union of both.
- When saving a snippet in a `parser: null` channel (python/rust/sql/general), skip Prettier formatting. The client passes `formattedCode === rawCode` and the API stores it as-is.
- `usePathname()` is a client-only hook, which is why we split `Sidebar` (server, static structure) and `SidebarNav` (client, applies active-link classes). Passing `items` as a prop from server → client is fine.
- Route group `(shell)` does NOT affect URLs. `app/(shell)/page.tsx` still serves `/`. `app/(shell)/channel/[slug]/page.tsx` serves `/channel/typescript` etc. Route groups are just a way to scope layouts.
- Keep `/c/[id]` outside the group — it lives at `app/c/[id]/page.tsx` today. Do NOT move it.

---

## Task 1: Add Vitest and testing dev dependencies

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1.1: Install Vitest + helpers**

Run:
```bash
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: installs succeed; `package.json` gains these devDeps.

- [ ] **Step 1.2: Add `test` script**

Modify `package.json` — under `"scripts"` add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 1.3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 1.4: Run the empty test suite to verify it boots**

Run: `npm test`
Expected: exits 0 with "No test files found" OR 1 test file with 0 tests (depending on Vitest version). Either is a pass signal — the runner boots without error.

- [ ] **Step 1.5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest + testing-library devDeps"
```

---

## Task 2: Channels module (TDD)

**Files:**
- Create: `lib/channels.ts`
- Test: `lib/channels.test.ts`

- [ ] **Step 2.1: Write the failing tests**

Create `lib/channels.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  CHANNELS,
  CHANNEL_SLUGS,
  channelForParser,
  isValidChannelSlug,
  getChannel,
} from './channels';

describe('channels module', () => {
  it('CHANNEL_SLUGS matches CHANNELS length and order', () => {
    expect(CHANNEL_SLUGS).toHaveLength(CHANNELS.length);
    expect(CHANNEL_SLUGS).toEqual(CHANNELS.map((c) => c.slug));
  });

  it('contains the expected seed channels', () => {
    expect(CHANNEL_SLUGS).toEqual([
      'general',
      'javascript',
      'typescript',
      'react',
      'css',
      'html',
      'json',
      'sql',
      'python',
      'rust',
    ]);
  });

  it('isValidChannelSlug accepts every seed slug', () => {
    for (const slug of CHANNEL_SLUGS) {
      expect(isValidChannelSlug(slug)).toBe(true);
    }
  });

  it('isValidChannelSlug rejects unknown values', () => {
    expect(isValidChannelSlug('not-real')).toBe(false);
    expect(isValidChannelSlug(null)).toBe(false);
    expect(isValidChannelSlug(42)).toBe(false);
    expect(isValidChannelSlug('')).toBe(false);
    expect(isValidChannelSlug(undefined)).toBe(false);
  });

  it('channelForParser resolves unambiguous parsers', () => {
    expect(channelForParser('typescript')).toBe('typescript');
    expect(channelForParser('css')).toBe('css');
    expect(channelForParser('html')).toBe('html');
    expect(channelForParser('json')).toBe('json');
  });

  it('channelForParser picks the first CHANNELS match for ambiguous parsers', () => {
    // babel is used by general, javascript, and react — general is first.
    expect(channelForParser('babel')).toBe('general');
  });

  it('channelForParser falls back to general for null/unknown', () => {
    expect(channelForParser(null)).toBe('general');
    expect(channelForParser('unknown-parser')).toBe('general');
  });

  it('getChannel returns the matching channel object or undefined', () => {
    const ts = getChannel('typescript');
    expect(ts?.name).toBe('TypeScript');
    expect(ts?.parser).toBe('typescript');
    expect(getChannel('not-real' as never)).toBeUndefined();
  });
});
```

- [ ] **Step 2.2: Run to verify failure**

Run: `npm test -- lib/channels.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2.3: Implement `lib/channels.ts`**

```ts
export const CHANNELS = [
  { slug: 'general',    name: 'General',    parser: 'babel',      icon: '#'   },
  { slug: 'javascript', name: 'JavaScript', parser: 'babel',      icon: 'JS'  },
  { slug: 'typescript', name: 'TypeScript', parser: 'typescript', icon: 'TS'  },
  { slug: 'react',      name: 'React',      parser: 'babel',      icon: 'Rx'  },
  { slug: 'css',        name: 'CSS',        parser: 'css',        icon: 'CSS' },
  { slug: 'html',       name: 'HTML',       parser: 'html',       icon: '</>' },
  { slug: 'json',       name: 'JSON',       parser: 'json',       icon: '{}'  },
  { slug: 'sql',        name: 'SQL',        parser: null,         icon: 'DB'  },
  { slug: 'python',     name: 'Python',     parser: null,         icon: 'Py'  },
  { slug: 'rust',       name: 'Rust',       parser: null,         icon: 'Rs'  },
] as const;

export type Channel = typeof CHANNELS[number];
export type ChannelSlug = Channel['slug'];

export const CHANNEL_SLUGS: readonly ChannelSlug[] = CHANNELS.map((c) => c.slug);

export function channelForParser(parser: string | null): ChannelSlug {
  if (parser == null) return 'general';
  const match = CHANNELS.find((c) => c.parser === parser);
  return match?.slug ?? 'general';
}

export function isValidChannelSlug(slug: unknown): slug is ChannelSlug {
  return typeof slug === 'string' && (CHANNEL_SLUGS as readonly string[]).includes(slug);
}

export function getChannel(slug: ChannelSlug): Channel | undefined {
  return CHANNELS.find((c) => c.slug === slug);
}
```

- [ ] **Step 2.4: Run to verify pass**

Run: `npm test -- lib/channels.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 2.5: Commit**

```bash
git add lib/channels.ts lib/channels.test.ts
git commit -m "feat(channels): seed channel list + helpers"
```

---

## Task 3: Samples module

**Files:**
- Create: `lib/samples.ts`

- [ ] **Step 3.1: Implement `lib/samples.ts`**

```ts
import type { ChannelSlug } from './channels';

export type Sample = { slug: ChannelSlug; code: string };

export const SAMPLES: readonly Sample[] = [
  { slug: 'javascript', code: 'const sum = (a, b) => a + b;' },
  { slug: 'typescript', code: 'type User = { id: string; name: string };' },
  { slug: 'python',     code: 'print("hello, world")' },
  { slug: 'react',      code: 'useEffect(() => { fetchData(); }, []);' },
  { slug: 'css',        code: '.btn { border-radius: 9999px; }' },
  { slug: 'sql',        code: 'SELECT * FROM users WHERE active = true;' },
  { slug: 'rust',       code: 'fn main() { println!("{}", 42); }' },
  { slug: 'json',       code: '{ "name": "stackly", "version": "1.0" }' },
  { slug: 'html',       code: '<button class="pill">Share</button>' },
  { slug: 'javascript', code: 'arr.filter(Boolean).map(String);' },
];

export const LOAD_SAMPLE_EVENT = 'stackly:load-sample';
export type LoadSampleDetail = { code: string; slug: ChannelSlug };
```

- [ ] **Step 3.2: Commit**

```bash
git add lib/samples.ts
git commit -m "feat(samples): curated marquee samples"
```

---

## Task 4: Prisma schema — add channelSlug

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_add_channel_slug/migration.sql` (generated)

- [ ] **Step 4.1: Update `prisma/schema.prisma`**

Replace the `CodeSnippet` block with:

```prisma
model CodeSnippet {
  id            String   @id @default(cuid())
  language      String
  rawCode       String   @db.Text
  formattedCode String   @db.Text
  channelSlug   String?  @map("channel_slug")
  createdAt     DateTime @default(now())

  @@index([channelSlug, createdAt])
  @@index([createdAt])
}
```

- [ ] **Step 4.2: Generate migration**

Run: `npx prisma migrate dev --name add_channel_slug`
Expected: creates a new migration folder under `prisma/migrations/`, runs it against the dev DB, regenerates the Prisma client.

If the DB is not reachable, fall back to `npx prisma migrate dev --create-only --name add_channel_slug`, inspect the generated SQL, then run `npx prisma generate` to refresh the client types.

- [ ] **Step 4.3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add channelSlug column to CodeSnippet"
```

---

## Task 5: API — accept channelSlug (TDD)

**Files:**
- Modify: `app/api/snippet/route.ts`
- Test: `app/api/snippet/route.test.ts`

The current API validates `language` via `isSupportedLanguage` (the 5 Prettier languages). Widen it so storable languages include all channel slugs that map to a "language" sense — i.e. accept either a `SupportedLanguage` or a `ChannelSlug`. This lets snippets from python/rust/sql channels persist without Prettier support.

- [ ] **Step 5.1: Write the failing tests**

Create `app/api/snippet/route.test.ts`:

```ts
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
```

- [ ] **Step 5.2: Run to verify failure**

Run: `npm test -- app/api/snippet/route.test.ts`
Expected: FAIL — several assertions fail because current API rejects `python` and ignores `channelSlug`.

- [ ] **Step 5.3: Replace `app/api/snippet/route.ts`**

```ts
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
```

- [ ] **Step 5.4: Run to verify pass**

Run: `npm test -- app/api/snippet/route.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5.5: Commit**

```bash
git add app/api/snippet/route.ts app/api/snippet/route.test.ts
git commit -m "feat(api): accept channelSlug on snippet create; widen storable languages"
```

---

## Task 6: Design tokens + marquee keyframes

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 6.1: Replace `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-bg-base:      #121212;
  --color-bg-sidebar:   #000000;
  --color-bg-surface:   #181818;
  --color-bg-mid:       #1f1f1f;
  --color-bg-card:      #252525;
  --color-text:         #ffffff;
  --color-text-muted:   #b3b3b3;
  --color-text-dim:     #7c7c7c;
  --color-accent:       #1ed760;
  --color-accent-hover: #1db954;
  --color-border:       #4d4d4d;

  --shadow-card:     0 8px 8px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 8px 24px rgba(0, 0, 0, 0.5);

  --radius-pill: 9999px;
  --radius-card: 8px;

  --font-sans: var(--font-inter);
}

html,
body {
  background: var(--color-bg-base);
  color: var(--color-text);
}

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--color-bg-mid); }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: var(--color-text-dim); }

.syntax-highlighted pre {
  padding: 1.5rem !important;
  margin: 0 !important;
  background: transparent !important;
  overflow-x: auto;
}
.syntax-highlighted code {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace !important;
  font-size: 14px;
  line-height: 1.6;
}

@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

.marquee-track {
  animation: marquee 60s linear infinite;
  will-change: transform;
}
.marquee-track:hover {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  .marquee-track {
    animation: none;
  }
  .marquee-scroll {
    overflow-x: auto;
  }
}
```

- [ ] **Step 6.2: Commit**

```bash
git add app/globals.css
git commit -m "style(theme): Spotify design tokens + marquee keyframes"
```

---

## Task 7: Root layout — rename to Stackly, use new tokens

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 7.1: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../app/monaco-env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Stackly — Format and share code snippets",
  description:
    "Stackly formats and shares code snippets with syntax highlighting, across language channels.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-[var(--color-bg-base)] text-[var(--color-text)]`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7.2: Commit**

```bash
git add app/layout.tsx
git commit -m "chore: rebrand root layout to Stackly"
```

---

## Task 8: Sidebar components

**Files:**
- Create: `components/Sidebar.tsx` (server)
- Create: `components/SidebarNav.tsx` (client)

- [ ] **Step 8.1: Create `components/SidebarNav.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type SidebarLink = {
  href: string;
  label: string;
  icon?: string;
};

type Props = { links: SidebarLink[] };

export default function SidebarNav({ links }: Props) {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== '/' && pathname?.startsWith(link.href));
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className={
                'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ' +
                (active
                  ? 'bg-[var(--color-bg-mid)] font-bold text-[var(--color-text)]'
                  : 'font-normal text-[var(--color-text-muted)] hover:text-[var(--color-text)]')
              }
            >
              {link.icon ? (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-bg-mid)] font-mono text-[10px] text-[var(--color-text)]">
                  {link.icon}
                </span>
              ) : null}
              <span>{link.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 8.2: Create `components/Sidebar.tsx`**

```tsx
import Link from 'next/link';
import { CHANNELS } from '@/lib/channels';
import SidebarNav, { type SidebarLink } from './SidebarNav';

const browseLinks: SidebarLink[] = [
  { href: '/', label: 'Home', icon: 'H' },
  { href: '/channel/general', label: 'General', icon: '#' },
];

const channelLinks: SidebarLink[] = CHANNELS.filter(
  (c) => c.slug !== 'general',
).map((c) => ({
  href: `/channel/${c.slug}`,
  label: c.name,
  icon: c.icon,
}));

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[240px] flex-col bg-[var(--color-bg-sidebar)] p-4 md:flex">
      <Link href="/" className="mb-6 inline-block text-xl font-bold">
        <span className="text-[var(--color-accent)]">S</span>tackly
      </Link>

      <nav className="space-y-6 overflow-y-auto">
        <section>
          <h2 className="mb-2 px-3 text-xs font-bold uppercase tracking-[1.4px] text-[var(--color-text-dim)]">
            Browse
          </h2>
          <SidebarNav links={browseLinks} />
        </section>

        <section>
          <h2 className="mb-2 px-3 text-xs font-bold uppercase tracking-[1.4px] text-[var(--color-text-dim)]">
            Channels
          </h2>
          <SidebarNav links={channelLinks} />
        </section>
      </nav>

      <div className="mt-auto pt-4">
        <Link
          href="/"
          className="block rounded-full bg-[var(--color-accent)] px-4 py-2 text-center text-sm font-bold uppercase tracking-[1.4px] text-black hover:bg-[var(--color-accent-hover)]"
        >
          New snippet
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 8.3: Commit**

```bash
git add components/Sidebar.tsx components/SidebarNav.tsx
git commit -m "feat(ui): Sidebar + SidebarNav with active-link detection"
```

---

## Task 9: Marquee component

**Files:**
- Create: `components/Marquee.tsx`

- [ ] **Step 9.1: Create `components/Marquee.tsx`**

```tsx
'use client';

import { SAMPLES, LOAD_SAMPLE_EVENT, type LoadSampleDetail } from '@/lib/samples';
import { getChannel } from '@/lib/channels';

function dispatchSample(detail: LoadSampleDetail) {
  const event = new CustomEvent<LoadSampleDetail>(LOAD_SAMPLE_EVENT, { detail });
  window.dispatchEvent(event);
}

export default function Marquee() {
  const doubled = [...SAMPLES, ...SAMPLES];

  return (
    <div className="marquee-scroll sticky top-0 z-20 flex h-12 items-center overflow-hidden border-b border-[var(--color-bg-mid)] bg-[var(--color-bg-surface)]">
      <div className="marquee-track flex shrink-0 items-center gap-3 whitespace-nowrap px-4">
        {doubled.map((sample, i) => {
          const channel = getChannel(sample.slug);
          return (
            <button
              key={`${sample.slug}-${i}`}
              type="button"
              onClick={() => dispatchSample({ code: sample.code, slug: sample.slug })}
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-bg-mid)] px-3 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
              title={`Load ${channel?.name ?? sample.slug} sample`}
            >
              <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
                {channel?.icon ?? '#'}
              </span>
              <code className="font-mono">{sample.code}</code>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 9.2: Commit**

```bash
git add components/Marquee.tsx
git commit -m "feat(ui): Marquee with infinite scroll + load-sample event"
```

---

## Task 10: ChannelPicker component

**Files:**
- Create: `components/ChannelPicker.tsx`

- [ ] **Step 10.1: Create `components/ChannelPicker.tsx`**

```tsx
'use client';

import { CHANNELS, type ChannelSlug } from '@/lib/channels';

type Props = {
  value: ChannelSlug;
  onChange: (slug: ChannelSlug) => void;
};

export default function ChannelPicker({ value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
      <span>Channel</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ChannelSlug)}
        className="rounded-full bg-[var(--color-bg-mid)] px-4 py-1 text-sm text-[var(--color-text)] outline-none"
      >
        {CHANNELS.map((c) => (
          <option key={c.slug} value={c.slug}>
            #{c.slug}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 10.2: Commit**

```bash
git add components/ChannelPicker.tsx
git commit -m "feat(ui): ChannelPicker dropdown"
```

---

## Task 11: SnippetCard component

**Files:**
- Create: `components/SnippetCard.tsx`

- [ ] **Step 11.1: Create `components/SnippetCard.tsx`**

```tsx
import Link from 'next/link';

type Props = {
  id: string;
  language: string;
  rawCode: string;
  formattedCode: string;
  createdAt: Date;
};

function timeAgo(date: Date): string {
  const sec = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function SnippetCard({
  id,
  language,
  rawCode,
  formattedCode,
  createdAt,
}: Props) {
  const preview = (formattedCode || rawCode).split('\n').slice(0, 8).join('\n');

  return (
    <Link
      href={`/c/${id}`}
      className="group block rounded-[8px] bg-[var(--color-bg-surface)] p-4 transition-colors hover:bg-[var(--color-bg-card)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-[var(--color-bg-mid)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[1.4px] text-[var(--color-text-muted)]">
          {language}
        </span>
        <span className="text-[10px] text-[var(--color-text-dim)]">
          {timeAgo(createdAt)}
        </span>
      </div>
      <pre className="overflow-hidden whitespace-pre font-mono text-[12px] leading-[1.5] text-[#cbcbcb]">
        {preview}
      </pre>
    </Link>
  );
}
```

- [ ] **Step 11.2: Commit**

```bash
git add components/SnippetCard.tsx
git commit -m "feat(ui): SnippetCard for channel grid"
```

---

## Task 12: Shell route group + layout

**Files:**
- Create: `app/(shell)/layout.tsx`

- [ ] **Step 12.1: Create `app/(shell)/layout.tsx`**

```tsx
import Sidebar from '@/components/Sidebar';
import Marquee from '@/components/Marquee';

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      <Sidebar />
      <div className="md:ml-[240px]">
        <Marquee />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 12.2: Commit**

```bash
git add app/(shell)/layout.tsx
git commit -m "feat(shell): route-group layout with Sidebar + Marquee"
```

---

## Task 13: Move home page into shell + wire ChannelPicker + sample events

**Files:**
- Delete: `app/page.tsx`
- Create: `app/(shell)/page.tsx`

- [ ] **Step 13.1: Create `app/(shell)/page.tsx`**

```tsx
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

// Editor supports this broader set; formatter supports only SupportedLanguage.
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

  // Track whether the channel was set implicitly (via language) so that an
  // explicit user pick or sample-load stays sticky across language changes.
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
    // Mirror to editor language when the channel carries a known editor language.
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
```

- [ ] **Step 13.2: Delete the old home page**

Run:
```bash
git rm app/page.tsx
```

- [ ] **Step 13.3: Verify build locally**

Run: `npm run build`
Expected: build succeeds with no route-collision errors. Warnings about `any` are fine, but no TypeScript errors.

- [ ] **Step 13.4: Commit**

```bash
git add app/(shell)/page.tsx
git commit -m "feat(home): move home into shell group, wire ChannelPicker + sample events"
```

---

## Task 14: Channel browse page

**Files:**
- Create: `app/(shell)/channel/[slug]/page.tsx`

- [ ] **Step 14.1: Create `app/(shell)/channel/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getChannel, isValidChannelSlug } from '@/lib/channels';
import SnippetCard from '@/components/SnippetCard';

type Params = { slug: string };

export default async function ChannelPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  if (!isValidChannelSlug(slug)) notFound();
  const channel = getChannel(slug);
  if (!channel) notFound();

  const snippets = await prisma.codeSnippet.findMany({
    where: { channelSlug: slug },
    orderBy: { createdAt: 'desc' },
    take: 24,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[1.4px] text-[var(--color-text-dim)]">
          Channel
        </p>
        <h1 className="text-3xl font-bold">#{channel.slug}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{channel.name}</p>
      </header>

      {snippets.length === 0 ? (
        <div className="rounded-[8px] bg-[var(--color-bg-surface)] p-8 text-center">
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">
            No snippets yet in #{channel.slug}. Be first — paste code on home.
          </p>
          <Link
            href="/"
            className="inline-block rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-bold uppercase tracking-[1.4px] text-black hover:bg-[var(--color-accent-hover)]"
          >
            New snippet
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {snippets.map((s) => (
            <SnippetCard
              key={s.id}
              id={s.id}
              language={s.language}
              rawCode={s.rawCode}
              formattedCode={s.formattedCode}
              createdAt={s.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 14.2: Verify dev server**

Run: `npm run dev`
Expected: server starts. Manually hit:
- `http://localhost:3000/` → shell renders with sidebar + marquee.
- `http://localhost:3000/channel/typescript` → page renders (likely empty state first run).
- `http://localhost:3000/channel/not-real` → 404.
- `http://localhost:3000/c/<existing-id>` if any exist → no sidebar, no marquee.

Stop the dev server.

- [ ] **Step 14.3: Commit**

```bash
git add app/(shell)/channel/[slug]/page.tsx
git commit -m "feat(channel): /channel/[slug] browse page with grid + 404"
```

---

## Task 15: Final verification pass

**Files:** none (QA only)

- [ ] **Step 15.1: Run all tests**

Run: `npm test`
Expected: all tests pass (Task 2 + Task 5 suites).

- [ ] **Step 15.2: Run production build**

Run: `npm run build`
Expected: build succeeds. Note any TypeScript / lint issues; fix before proceeding.

- [ ] **Step 15.3: Manual QA checklist (from spec)**

Start `npm run dev`. Confirm:

- [ ] Home loads with sidebar + marquee visible on ≥768px.
- [ ] Clicking a sample pill loads the sample into the editor; channel dropdown + language selector follow.
- [ ] With dirty editor content, sample click shows the replace-confirm dialog.
- [ ] Picking a channel from the dropdown and sharing persists the slug (verify by visiting `/channel/<slug>` and seeing the new card).
- [ ] `/channel/typescript` renders the recent TS snippets grid.
- [ ] `/channel/not-real` renders the 404 page.
- [ ] `/c/<id>` has no sidebar and no marquee.
- [ ] Resize to <768px: sidebar hides (not yet a bottom tab bar — documented as follow-up).
- [ ] Enable "reduce motion" in OS preferences: marquee becomes static, scrollable row.

- [ ] **Step 15.4: Commit any fixups**

If QA turned up issues, fix them, add tests where appropriate, and commit. Then re-run `npm test` and `npm run build`.

```bash
git add .
git commit -m "fix: address QA findings from channels + marquee rollout"
```

---

## Deferred / Follow-up (not in this plan)

- **Mobile sidebar as bottom tab bar.** The spec calls for sidebar → bottom bar on mobile. Task 8 hides the sidebar on `<md`; the bottom-bar variant is intentionally deferred to a follow-up plan to keep this plan bite-sized.
- **Real-time collaboration** on snippets within a channel — separate future spec.
- **Dynamic banner samples** from recent public snippets — swap-in once volume is high.

---

## Self-review notes (inline)

Spec coverage check:
- §4 data model → Task 4 ✓
- §5 routes + API → Task 5, Task 12, Task 13, Task 14 ✓
- §6 components → Tasks 8–11, 13 ✓
- §7 styling → Task 6 ✓
- §8 error handling → Task 5 (slug fallback, 400s), Task 13 (dirty-editor confirm), Task 14 (notFound + empty state), Task 6 (reduced-motion) ✓
- §9 testing → Tasks 2, 5, 15 ✓
- §10 migration → Task 4 ✓
- Mobile bottom tab bar explicitly deferred (see "Deferred") since Task 8 only hides the sidebar on `<md`; flagged so reviewers see it's a known gap, not an oversight.

Type consistency check:
- `ChannelSlug` is the single source of truth for channel values; `LOAD_SAMPLE_EVENT` / `LoadSampleDetail` live in `lib/samples.ts` and are imported by `Marquee` and the home page.
- API widens accepted `language` via `STORABLE_LANGUAGES`; `formatter.isSupportedLanguage` still gatekeeps Prettier.
- `getChannel(slug)` returns `Channel | undefined`; the home page guards `slug !== 'general'` before using the slug as an editor language.
