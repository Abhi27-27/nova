'use client';

import {
  Activity,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Tags,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WorkspaceSwitcher } from './workspace-switcher';

const NAVIGATION = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/app/projects', label: 'Projects', icon: FolderKanban },
  { href: '/app/tasks', label: 'My tasks', icon: CheckSquare },
  { href: '/app/team', label: 'Team', icon: Users },
  { href: '/app/labels', label: 'Labels', icon: Tags },
  { href: '/app/activity', label: 'Activity', icon: Activity },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname() ?? '/app';

  return (
    <>
      {/* Scrim for the mobile drawer. */}
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-[oklch(0.2_0.02_265_/_0.45)] lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          'border-border bg-card fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform duration-200',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Brand size="sm" href="/app" />
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X />
          </Button>
        </div>

        <div className="px-3 pb-3">
          <WorkspaceSwitcher />
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {NAVIGATION.map((item) => {
            const active = isActive(pathname, item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                  active
                    ? 'bg-primary-subtle text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {/* The active indicator is a rail rather than a full highlight, so
                    scanning the list reads as one continuous column. */}
                <span
                  className={cn(
                    'bg-primary absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full transition-opacity',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden
                />
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-border border-t p-3">
          <div className="bg-muted/60 rounded-lg p-3">
            <p className="text-[12px] font-semibold">Keyboard shortcuts</p>
            <dl className="text-muted-foreground mt-2 space-y-1 text-[11.5px]">
              <div className="flex items-center justify-between gap-2">
                <dt>Search</dt>
                <dd>
                  <kbd className="border-border bg-card rounded border px-1.5 py-0.5 font-mono text-[10px]">
                    Ctrl K
                  </kbd>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt>New task</dt>
                <dd>
                  <kbd className="border-border bg-card rounded border px-1.5 py-0.5 font-mono text-[10px]">
                    C
                  </kbd>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </aside>
    </>
  );
}
