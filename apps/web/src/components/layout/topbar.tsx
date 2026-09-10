'use client';

import { LogOut, Menu as MenuIcon, Search, Settings, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Menu, MenuItem, MenuSeparator } from '@/components/ui/menu';
import { NotificationsMenu } from './notifications-menu';
import { ThemeToggle } from './theme-toggle';

export function Topbar({
  onOpenSidebar,
  onOpenSearch,
}: {
  onOpenSidebar: () => void;
  onOpenSearch: () => void;
}) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="border-border glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
      >
        <MenuIcon />
      </Button>

      {/* A button rather than an input: it opens the palette, and pretending to be
          a text field would be a lie about what clicking it does. */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="border-border bg-background text-muted-foreground hover:bg-muted flex h-9 flex-1 items-center gap-2.5 rounded-lg border px-3 text-left text-[13px] transition-colors lg:max-w-md"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">Search projects and tasks…</span>
        <kbd className="border-border bg-card hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <NotificationsMenu />

        {user ? (
          <Menu
            header={
              <div className="flex items-center gap-2.5">
                <Avatar user={user} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] leading-tight font-semibold">{user.name}</p>
                  <p className="text-muted-foreground truncate text-[11.5px]">{user.email}</p>
                </div>
              </div>
            }
            trigger={
              <span className="ring-offset-background hover:ring-border inline-flex rounded-full ring-offset-2 transition-shadow hover:ring-2">
                <Avatar user={user} size="sm" />
                <span className="sr-only">Account menu</span>
              </span>
            }
          >
            <MenuItem icon={<UserIcon />} onClick={() => router.push('/app/settings')}>
              Profile
            </MenuItem>
            <MenuItem icon={<Settings />} onClick={() => router.push('/app/settings')}>
              Workspace settings
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<LogOut />} destructive onClick={() => void signOut()}>
              Sign out
            </MenuItem>
          </Menu>
        ) : null}
      </div>
    </header>
  );
}
