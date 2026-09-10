import { APP_TAGLINE } from '@nova/shared';
import { CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/layout/theme-toggle';

const HIGHLIGHTS = [
  'Kanban boards with drag-and-drop that survives concurrent edits',
  'Workspace and project roles enforced on every request',
  'Dashboards built from one aggregated query, not eight',
  'A complete audit trail of who changed what, and when',
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — decorative, so it is hidden from small screens entirely
          rather than being squeezed into a strip nobody reads. */}
      <aside className="bg-primary text-primary-foreground relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px, 72px 72px',
          }}
          aria-hidden
        />

        <div className="relative">
          <Brand size="lg" className="[&_span]:text-primary-foreground" />
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">
            Plan. Collaborate. Deliver.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed opacity-80">
            One workspace for projects, tasks, people and progress — so the plan and the work never
            drift apart.
          </p>

          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13.5px] opacity-90">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[13px] opacity-70">{APP_TAGLINE}</p>
      </aside>

      <main id="main" className="relative flex flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <div className="lg:hidden">
            <Brand size="sm" />
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
