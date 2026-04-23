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
