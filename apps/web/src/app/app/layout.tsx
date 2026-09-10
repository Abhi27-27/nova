'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Brand } from '@/components/brand';
import { CommandPalette } from '@/components/layout/command-palette';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { Spinner } from '@/components/ui/feedback';

/**
 * The authenticated shell.
 *
 * Route protection happens here rather than in Next middleware: the session cookie
 * belongs to the API's origin, which middleware running on the web host cannot
 * read when the two are deployed separately. Guarding in the client works for both
 * deployment shapes.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname ?? '/app')}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Ctrl/Cmd+K anywhere in the app opens search.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <Brand size="lg" href={null} />
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner />
          {isLoading ? 'Checking your session…' : 'Redirecting to sign in…'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        <Topbar
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />

        <main id="main" className="mx-auto max-w-[92rem] px-4 py-6 lg:px-6 lg:py-8">
          {children}
        </main>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
