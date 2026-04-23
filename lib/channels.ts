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
