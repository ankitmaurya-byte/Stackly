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
