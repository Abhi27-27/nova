'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, MenuItem, MenuLabel } from '@/components/ui/menu';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The server cannot know the visitor's theme, so the icon is only decided after
  // mount. Rendering a neutral placeholder first avoids a hydration mismatch.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" aria-label="Change theme" disabled>
        <Sun />
      </Button>
    );
  }

  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <Menu
      trigger={
        <span
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors"
          role="presentation"
        >
          <Icon className="size-4" aria-hidden />
          <span className="sr-only">Change theme</span>
        </span>
      }
    >
      <MenuLabel>Appearance</MenuLabel>
      {OPTIONS.map((option) => (
        <MenuItem
          key={option.value}
          icon={<option.icon />}
          onClick={() => setTheme(option.value)}
          className={theme === option.value ? 'bg-muted text-foreground' : undefined}
        >
          {option.label}
        </MenuItem>
      ))}
    </Menu>
  );
}
