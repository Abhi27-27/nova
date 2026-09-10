'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckSquare,
  CornerDownLeft,
  FolderKanban,
  LayoutDashboard,
  Search,
  Settings,
  Tags,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { StatusBadge } from '@/components/ui/badge';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  hint?: ReactNode;
  icon: ReactNode;
  group: string;
  run: () => void;
}

const PAGES = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/projects', label: 'Projects', icon: FolderKanban },
  { href: '/app/tasks', label: 'My tasks', icon: CheckSquare },
  { href: '/app/team', label: 'Team', icon: Users },
  { href: '/app/labels', label: 'Labels', icon: Tags },
  { href: '/app/activity', label: 'Activity', icon: Activity },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

/**
 * Ctrl/Cmd+K search across pages, projects and tasks.
 *
 * The task query is debounced and only runs once there is something to search
 * for, so opening the palette does not fire a request on every keystroke.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    if (open) {
      setTerm('');
      setDebounced('');
      setHighlighted(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list({ pageSize: 50, palette: true }),
    queryFn: () => endpoints.projects.list({ pageSize: 50 }),
    enabled: open,
    staleTime: 60_000,
  });

  const { data: tasks } = useQuery({
    queryKey: queryKeys.tasks.list({ search: debounced, palette: true }),
    queryFn: () => endpoints.tasks.list({ search: debounced, pageSize: 8 }),
    enabled: open && debounced.length >= 2,
  });

  const items = useMemo<CommandItem[]>(() => {
    const needle = debounced.toLowerCase();
    const go = (href: string) => () => {
      onClose();
      router.push(href);
    };

    const pageItems: CommandItem[] = PAGES.filter(
      (page) => !needle || page.label.toLowerCase().includes(needle),
    ).map((page) => ({
      id: `page:${page.href}`,
      label: page.label,
      icon: <page.icon className="size-4" aria-hidden />,
      group: 'Go to',
      run: go(page.href),
    }));

    const projectItems: CommandItem[] = (projects?.items ?? [])
      .filter(
        (project) =>
          !needle ||
          project.name.toLowerCase().includes(needle) ||
          project.key.toLowerCase().includes(needle),
      )
      .slice(0, 6)
      .map((project) => ({
        id: `project:${project.id}`,
        label: project.name,
        hint: <span className="text-muted-foreground font-mono text-[11px]">{project.key}</span>,
        icon: (
          <span
            className="size-3 rounded-[4px]"
            style={{ backgroundColor: project.color }}
            aria-hidden
          />
        ),
        group: 'Projects',
        run: go(`/app/projects/${project.id}`),
      }));

    const taskItems: CommandItem[] = (tasks?.items ?? []).map((task) => ({
      id: `task:${task.id}`,
      label: task.title,
      hint: <StatusBadge status={task.status} />,
      icon: <span className="text-muted-foreground font-mono text-[10px]">{task.reference}</span>,
      group: 'Tasks',
      run: go(`/app/tasks/${task.id}`),
    }));

    return [...pageItems, ...projectItems, ...taskItems];
  }, [debounced, projects, tasks, onClose, router]);

  useEffect(() => {
    setHighlighted((current) => Math.min(current, Math.max(items.length - 1, 0)));
  }, [items.length]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlighted((current) => (current + 1) % Math.max(items.length, 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlighted((current) => (current - 1 + items.length) % Math.max(items.length, 1));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        items[highlighted]?.run();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, items, highlighted, onClose]);

  // Keep the highlighted row in view when navigating with the keyboard.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${highlighted}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  if (!open || typeof document === 'undefined') return null;

  let lastGroup = '';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div
        className="animate-fade-in absolute inset-0 bg-[oklch(0.2_0.02_265_/_0.5)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search NOVA"
        className="border-border bg-card shadow-overlay animate-slide-up relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border"
      >
        <div className="border-border flex items-center gap-3 border-b px-4">
          <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search projects and tasks, or jump to a page…"
            className="placeholder:text-muted-foreground h-12 flex-1 bg-transparent text-sm outline-none"
            aria-label="Search"
          />
          <kbd className="border-border text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="text-muted-foreground px-3 py-8 text-center text-[13px]">
              {debounced.length >= 2 ? `Nothing matches “${debounced}”` : 'Start typing to search'}
            </p>
          ) : (
            items.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;

              return (
                <div key={item.id}>
                  {showGroup ? (
                    <p className="text-muted-foreground px-2.5 pt-2.5 pb-1 text-[10.5px] font-semibold tracking-wide uppercase">
                      {item.group}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={item.run}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                      index === highlighted ? 'bg-muted' : 'hover:bg-muted/60',
                    )}
                  >
                    <span className="text-muted-foreground flex w-12 shrink-0 items-center justify-start">
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    {item.hint}
                    {index === highlighted ? (
                      <CornerDownLeft
                        className="text-muted-foreground size-3.5 shrink-0"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
