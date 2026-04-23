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
