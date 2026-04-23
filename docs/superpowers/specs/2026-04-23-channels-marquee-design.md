# Channels Sidebar + Marquee Banner — Design Spec

**Date:** 2026-04-23
**Status:** Draft — awaiting user review
**Scope:** Channels sidebar (fixed seed list) + moving top marquee banner with curated code samples. Real-time collaboration deferred to a future spec.

---

## 1. Goals & Non-Goals

### Goals
- Add a persistent Spotify-style left sidebar listing a fixed set of language/topic channels.
- Add a moving top banner (marquee) showing curated code samples; clicking a sample loads it into the editor.
- Group snippets under a channel so `/channel/[slug]` pages can browse recent snippets per topic.
- Preserve the focused read experience on `/c/[id]` (no shell, no distractions).

### Non-Goals (explicitly deferred)
- Real-time collaborative editing (separate future spec — needs auth + WebSocket/SSE + CRDT/OT).
- Authentication / user accounts — all content remains public and anonymous.
- User-created channels — channel list is a code constant; no moderation surface.
- Dynamic banner content from DB — curated samples only; future spec may swap in recent snippets.

---

## 2. Context

Stackly is a Next.js 16 + React 19 app that formats code with Prettier and shares snippets via `/c/{id}` URLs. Current UI is a single home editor with no navigation. `DESIGN.md` defines a Spotify-inspired dark design system (pill geometry, `#121212`–`#1f1f1f` surfaces, Spotify Green `#1ed760` as a functional-only accent). This spec applies that system to a navigation shell.

---

## 3. Architectural Approach

**Approach 1 (chosen): Minimal DB change + layout shell**
- Add one nullable `channelSlug` column to `CodeSnippet`.
- Channels live as TypeScript constants in `lib/channels.ts` — no `Channel` table.
- New Next.js route group `(shell)` provides sidebar + marquee for home and channel pages; `/c/[id]` stays outside the group.

**Approach 2 (rejected): Full `Channel` table**
- Future-proof but adds a join, migration, and seed script with no current payoff. YAGNI.

**Approach 3 (rejected): localStorage-only channels**
- Zero DB change but channel pages cannot list snippets in channel. Breaks browse goal.

---

## 4. Data Model

### Prisma schema change

The existing model is `CodeSnippet` with fields `id`, `language`, `rawCode`, `formattedCode`, `createdAt`. Add one nullable column + a compound index:

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

- `channelSlug` is nullable so existing rows keep working. UI treats `null` as "general" for display purposes but does not backfill.
- Compound index `(channelSlug, createdAt)` supports the channel-page list query `WHERE channel_slug = ? ORDER BY created_at DESC LIMIT 24`. Existing `createdAt` index retained.
- Migration name: `add_channel_slug`.

### Channels constant (`lib/channels.ts`)

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

export type ChannelSlug = typeof CHANNELS[number]['slug'];
export const CHANNEL_SLUGS: readonly ChannelSlug[] = CHANNELS.map(c => c.slug);

export function channelForParser(parser: string | null): ChannelSlug {
  const match = CHANNELS.find(c => c.parser === parser);
  return match?.slug ?? 'general';
}

export function isValidChannelSlug(slug: unknown): slug is ChannelSlug {
  return typeof slug === 'string' && (CHANNEL_SLUGS as readonly string[]).includes(slug);
}
```

- `parser: null` channels skip Prettier formatting; snippet is stored as-is.
- `channelForParser` reverse-looks-up the first matching channel — used by the home editor to auto-pick a channel based on the selected language's Prettier parser.

### Samples constant (`lib/samples.ts`)

Each sample is anchored to a `ChannelSlug`. The channel carries the canonical `parser` (via `CHANNELS`), so sample loading fully determines both editor language and target channel from one field.

```ts
import type { ChannelSlug } from './channels';

export const SAMPLES: ReadonlyArray<{ slug: ChannelSlug; code: string }> = [
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
] as const;
```

---

## 5. Routes & Layout

```
app/
├── (shell)/
│   ├── layout.tsx                 # renders <Sidebar/> <Marquee/> <main>{children}</main>
│   ├── page.tsx                   # home editor (moved from app/page.tsx)
│   └── channel/
│       └── [slug]/
│           └── page.tsx           # server component: list recent snippets in channel
├── c/
│   └── [id]/
│       └── page.tsx               # unchanged — no shell, focused read
├── api/
│   ├── format/route.ts            # unchanged
│   └── snippet/
│       ├── route.ts               # POST — accepts optional channelSlug
│       └── [id]/route.ts          # GET unchanged
└── layout.tsx                     # root (html, body, fonts, global dark class)
```

### Route behavior

- **`/` (home):** renders editor inside shell. Channel defaults to `channelForParser(currentParser)`, is overridden by marquee sample-load, and is finally the user's explicit `ChannelPicker` choice (see "ChannelPicker details" for precedence). On share, POST includes the resulting `channelSlug`.
- **`/channel/[slug]`:** server-side validates slug against `CHANNEL_SLUGS`. Invalid → `notFound()` (404). Valid → fetches latest 24 snippets via `prisma.codeSnippet.findMany({ where: { channelSlug: slug }, orderBy: { createdAt: 'desc' }, take: 24 })`. Renders channel header + grid of `SnippetCard` components. Empty state card when count = 0.
- **`/c/[id]`:** unchanged. Deliberately outside `(shell)` group to keep the focused read.

### API changes

- **`POST /api/snippet`:** accept optional `channelSlug` in body. Validate via `isValidChannelSlug`; fall back to `"general"` if missing or invalid. Log invalid attempts once server-side for observability, do not surface an error to the client.
- No new endpoints. Channel metadata is static (constant), and channel pages fetch directly via Prisma in a server component.

### Shell responsive behavior

- **Desktop (≥768px):** sidebar fixed left at 240px; marquee fixed top at 48px; content fills the remaining area.
- **Mobile (<768px):** sidebar collapses to a bottom tab bar (same links, icons only); marquee remains at top.

---

## 6. Components

| Component | Path | Type | Purpose |
|---|---|---|---|
| `Sidebar` | `components/Sidebar.tsx` | server + client subcomponent for active-link detection | Fixed left navigation: wordmark, Browse (Home, General), Channels (mapped from `CHANNELS`), bottom "New snippet" pill |
| `Marquee` | `components/Marquee.tsx` | client | Infinite horizontal scroll of sample pills; click dispatches `stackly:load-sample` custom event; respects `prefers-reduced-motion` |
| `ChannelPicker` | `components/ChannelPicker.tsx` | client | Dropdown next to the Share button on home; auto-selects based on language, user can override |
| `SnippetCard` | `components/SnippetCard.tsx` | server | Channel grid cell: first ~8 lines of code in mono, language badge, relative timestamp |

### Sidebar details

- Background `#000000` (deeper than content — Spotify pattern).
- Width 240px. Full viewport height.
- Wordmark "Stackly" at top, leading `S` in `#1ed760`.
- Section 1 — "Browse" label (uppercase, tracking, muted). Items: Home (`/`), General (`/channel/general`).
- Section 2 — "Channels" label. Maps `CHANNELS` to link rows. Each row: 24px `#1f1f1f` icon chip (mono font) + channel name.
- Active slug (detected via `usePathname()` in a client sub-component) gets `text-white font-bold`; inactive gets `text-[#b3b3b3] font-normal`.
- Bottom: "New snippet" pill button → `/`.

### Marquee details

- Fixed top of shell, 48px tall, `#181818` bg, 1px `#1f1f1f` bottom border.
- `@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }` on a track containing the `SAMPLES` array duplicated (so looping looks seamless). 60s linear infinite. Pause on hover via `:hover { animation-play-state: paused; }`.
- Each sample: `<button>` styled as a pill — `#1f1f1f` bg, `#b3b3b3` text, 12px mono font, `4px 12px` padding, `9999px` radius. Hover text → `#1ed760`.
- Click dispatches `new CustomEvent('stackly:load-sample', { detail: { code, slug } })`. Home editor's client component subscribes and, on receipt: (1) loads `code` into the editor, (2) looks up the channel via `CHANNELS.find(c => c.slug === slug)`, (3) sets the editor's active Prettier parser to that channel's `parser` (null-parser channels skip formatting), and (4) sets `ChannelPicker` selection to `slug`.
- `prefers-reduced-motion: reduce` → animation disabled; track becomes `overflow-x: auto` so users can scroll manually.

### ChannelPicker details

- Small dropdown (pill, `#1f1f1f` bg) next to the Share button on the home editor.
- Options come from `CHANNELS`. Selected row shows a subtle `#1ed760` check.
- **Selection sources (precedence, highest first):**
  1. Explicit user pick in the dropdown — sticky until the user changes it or loads a new sample.
  2. Sample-load event — sets selection to `sample.slug` (overrides prior state).
  3. Existing `LanguageSelector` change — calls `channelForParser(newParser)` as a fallback default. Ambiguous parsers (e.g. `babel` maps to multiple channels) resolve to the first match in `CHANNELS` order, which puts `general` before language-specific variants so the default is the safe generic bucket.
- The dropdown is the source of truth for the `channelSlug` sent in the Share POST.

### SnippetCard details

- `bg-[#181818] rounded-[8px] p-4 hover:bg-[#252525] transition-colors` with a subtle shadow on hover.
- Contents: top-right language badge (from `CodeSnippet.language`); code preview (first 8 lines of `formattedCode`, falling back to `rawCode` if the former is empty, mono 12px, `#cbcbcb`); bottom-left relative timestamp (e.g. "2h ago"); entire card wraps an `<a href="/c/{id}">`.

---

## 7. Styling (Spotify design tokens)

Add tokens to `app/globals.css` as CSS variables and expose them through Tailwind v4's `@theme` directive.

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
}

@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .marquee-track { animation: none; }
  .marquee-scroll { overflow-x: auto; }
}
```

### Component style conventions

- **Pills:** `rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[1.4px]`
- **Cards:** `bg-[var(--color-bg-surface)] rounded-[8px] hover:bg-[var(--color-bg-card)] transition-colors`
- **Active nav:** `text-white font-bold` / inactive: `text-[var(--color-text-muted)] font-normal`
- **Accent usage (functional only, per DESIGN.md):** Spotify logo `S`, Share CTA, sample-pill hover text, ChannelPicker selected-row check. No decorative green anywhere else.

### Fonts

`DESIGN.md` specifies SpotifyMixUI / CircularSp, which are proprietary Spotify fonts not available for distribution. Use a closest-available fallback stack:

```css
font-family: system-ui, -apple-system, "Segoe UI", "Helvetica Neue", helvetica, arial,
             "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
```

The spec acknowledges this divergence from `DESIGN.md`. A future spec may revisit with a licensed or open-source alternative (e.g. Inter) if desired.

---

## 8. Error Handling

- **Invalid channel slug on `/channel/[slug]`:** call Next.js `notFound()`; the framework renders the 404 page.
- **Invalid `channelSlug` on `POST /api/snippet`:** fall back silently to `"general"`. Log once server-side (`console.warn` with slug value). Never fail the share flow over a UI-side bug.
- **Marquee sample click with dirty editor:** if the editor has non-empty user code that differs from the last sample loaded, show a native `confirm()`: "Replace current code?" (YES / CANCEL). Skip the confirm when the editor is empty.
- **Empty channel page:** render a single empty-state card: "No snippets yet in #{channel}. Be first — paste code on home." with a pill button linking to `/`.
- **Sample data is static**, shipped in the JS bundle — no fetch, no network errors possible in the marquee.
- **`prefers-reduced-motion: reduce`:** animation disabled; the track becomes horizontally scrollable so content remains accessible.

---

## 9. Testing Strategy

The project has no tests today. Add a minimal Vitest setup — no full E2E harness yet.

### Unit tests

- `lib/channels.test.ts`
  - `CHANNEL_SLUGS` length matches `CHANNELS` length.
  - `isValidChannelSlug` returns `true` for every slug in `CHANNEL_SLUGS` and `false` for `"not-real"`, `null`, `42`, `""`.
  - `channelForParser('typescript')` returns `'typescript'`.
  - `channelForParser('babel')` returns `'general'` (first match in `CHANNELS` order — documents the ambiguous-parser fallback behavior described in ChannelPicker precedence).
  - `channelForParser('css')` returns `'css'`.
  - `channelForParser(null)` returns `'general'`.
  - `channelForParser('unknown-parser')` returns `'general'`.
- `app/api/snippet/route.test.ts`
  - Valid `channelSlug` persists as-is.
  - Invalid `channelSlug` falls back to `"general"`.
  - Missing `channelSlug` falls back to `"general"`.
  - (Prisma mocked at the module boundary — no live DB.)

### Manual QA checklist

- Home loads with sidebar + marquee visible.
- Click a sample pill → editor content and language switch accordingly.
- Pick a non-default channel from the dropdown → share → snippet persists with that slug (verified via `/channel/{slug}` listing).
- Visit `/channel/typescript` → see recent TypeScript snippets in grid.
- Visit `/channel/not-real` → 404 page rendered.
- Visit `/c/{id}` → no sidebar, no marquee. Focused read preserved.
- Resize to mobile (<768px) → sidebar collapses to bottom tab bar; marquee stays at top.
- Set OS "reduce motion" → marquee becomes a static scrollable row; no auto-scroll.

---

## 10. Migration & Rollout

1. Add `channelSlug` column + index via `prisma migrate dev --name add_channel_slug`.
2. No data backfill — existing snippets keep `null` slugs; UI treats `null` as "general" for display purposes only.
3. Deploy. Channel pages for channels with no snippets show the empty state.
4. Update `README.md` with a brief section: "Channels" and "Marquee".

---

## 11. Open Questions / Future Work

- **Real-time collab:** sequel spec. Builds on channels (channel room → collab sessions) and will need auth, WebSocket/SSE transport, and CRDT/OT for conflict-free concurrent edits.
- **User-created channels:** requires auth + moderation + a real `Channel` table. Explicitly out of scope here.
- **Dynamic banner samples:** swap curated samples for recent public snippets once snippet volume is high enough to avoid empty/stale banners.
- **Licensed fonts:** revisit font stack if/when a licensed or open-source match for Spotify's typography is chosen.
