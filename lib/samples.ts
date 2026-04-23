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
