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
