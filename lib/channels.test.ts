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
