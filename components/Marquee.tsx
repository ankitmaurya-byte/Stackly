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
