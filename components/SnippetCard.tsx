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
