import Sidebar from '@/components/Sidebar';
import Marquee from '@/components/Marquee';

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      <Sidebar />
      <div className="md:ml-[240px]">
        <Marquee />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
