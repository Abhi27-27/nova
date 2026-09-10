import { APP_TAGLINE } from '@nova/shared';
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  KanbanSquare,
  Layers,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import { ButtonLink } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';

/**
 * Marketing page.
 *
 * Rendered as a server component with no client-side data, so it is fully static
 * and the first thing a visitor sees costs one round-trip.
 */

const FEATURES = [
  {
    icon: KanbanSquare,
    title: 'Boards that keep their order',
    description:
      'Drag cards between columns and the position is derived from the neighbours you dropped between — so two people rearranging the same board never fight over it.',
  },
  {
    icon: BarChart3,
    title: 'Progress you can actually read',
    description:
      'Completion rate, created-versus-completed throughput, workload per person and overdue work — aggregated server-side and delivered in a single request.',
  },
  {
    icon: Users,
    title: 'Roles that mean something',
    description:
      'Owners, admins and members at the workspace level; leads, members and viewers per project. Every request is checked against both.',
  },
  {
    icon: Bell,
    title: 'Told once, in the right place',
    description:
      'Assignments, status changes and replies arrive as in-app notifications. A full audit trail records who changed what, and when.',
  },
  {
    icon: Layers,
    title: 'Labels, priorities, due dates',
    description:
      'Filter by any combination across every project at once, then save the view by simply keeping the URL.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by construction',
    description:
      'Argon-grade password hashing, rotating refresh tokens in httpOnly cookies, per-account rate limiting and tenant scoping enforced in the query layer.',
  },
];

const WORKFLOW = [
  {
    step: '01',
    title: 'Create a workspace',
    description: 'Invite the team and give everyone the right level of access from day one.',
  },
  {
    step: '02',
    title: 'Plan the work',
    description: 'Break projects into tasks with owners, priorities, labels and dates.',
  },
  {
    step: '03',
    title: 'Deliver, and see it',
    description: 'Move cards across the board and watch the dashboard follow in real time.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-border/70 glass sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Brand />
          <nav className="flex items-center gap-2">
            <Link
              href="#features"
              className="text-muted-foreground hover:text-foreground hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:inline-flex"
            >
              Features
            </Link>
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              Sign in
            </Link>
            <ThemeToggle />
            <ButtonLink href="/register" size="sm">
              Get started
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="grid-backdrop pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
          />

          <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-20 text-center sm:pt-28">
            <span className="border-border bg-card text-muted-foreground shadow-subtle inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12.5px] font-medium">
              <Zap className="text-primary size-3.5" aria-hidden />
              Projects, tasks and people in one place
            </span>

            <h1 className="mx-auto mt-7 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight sm:text-6xl">
              The team productivity platform that
              <span className="text-primary"> keeps everyone aligned</span>
            </h1>

            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
              NOVA gives your team one place to plan projects, track tasks on a Kanban board,
              collaborate in context and see exactly how delivery is going. {APP_TAGLINE}
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/register" size="lg" icon={<ArrowRight />}>
                Start for free
              </ButtonLink>
              <ButtonLink href="/login" size="lg" variant="secondary">
                Sign in to your workspace
              </ButtonLink>
            </div>

            <p className="text-muted-foreground mt-4 text-[13px]">
              Demo account: <span className="text-foreground font-medium">aarav@novalabs.dev</span>{' '}
              · <span className="text-foreground font-medium">Password123</span>
            </p>

            {/* Product preview */}
            <div className="relative mx-auto mt-16 max-w-5xl">
              <div className="border-border bg-card shadow-raised overflow-hidden rounded-2xl border">
                <div className="border-border bg-muted/50 flex items-center gap-2 border-b px-4 py-3">
                  <span className="bg-danger/60 size-2.5 rounded-full" />
                  <span className="bg-warning/60 size-2.5 rounded-full" />
                  <span className="bg-success/60 size-2.5 rounded-full" />
                  <span className="text-muted-foreground ml-3 text-[12px]">
                    nova.app / apollo-web-platform / board
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 text-left sm:grid-cols-4">
                  {[
                    { name: 'Backlog', tone: 'bg-status-backlog', count: 8, cards: 3 },
                    { name: 'In Progress', tone: 'bg-status-progress', count: 4, cards: 2 },
                    { name: 'In Review', tone: 'bg-status-review', count: 3, cards: 2 },
                    { name: 'Done', tone: 'bg-status-done', count: 12, cards: 3 },
                  ].map((column) => (
                    <div key={column.name} className="space-y-2.5">
                      <div className="flex items-center gap-2 px-1">
                        <span className={`size-2 rounded-full ${column.tone}`} />
                        <span className="text-[12.5px] font-semibold">{column.name}</span>
                        <span className="text-muted-foreground text-[11px]">{column.count}</span>
                      </div>
                      {Array.from({ length: column.cards }).map((_, index) => (
                        <div
                          key={index}
                          className="border-border bg-background space-y-2 rounded-lg border p-2.5"
                        >
                          <div className="bg-muted h-1.5 w-4/5 rounded-full" />
                          <div className="bg-muted h-1.5 w-3/5 rounded-full" />
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="bg-primary-subtle h-3.5 w-10 rounded" />
                            <span className="bg-muted ml-auto size-4 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-border bg-muted/30 border-t py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything a delivery team needs
              </h2>
              <p className="text-muted-foreground mt-4">
                Not a to-do list with extra steps — a complete workflow, from the first idea to the
                report at the end of the sprint.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="border-border bg-card shadow-card hover:shadow-raised rounded-xl border p-5 transition-shadow"
                >
                  <div className="bg-primary-subtle text-primary flex size-10 items-center justify-center rounded-lg">
                    <feature.icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground mt-2 text-[13.5px] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Up and running in three steps
              </h2>
            </div>

            <ol className="mt-12 grid gap-6 sm:grid-cols-3">
              {WORKFLOW.map((item) => (
                <li
                  key={item.step}
                  className="border-border bg-card relative rounded-xl border p-6"
                >
                  <span className="text-primary text-[12px] font-semibold tracking-widest">
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground mt-2 text-[13.5px] leading-relaxed">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Call to action */}
        <section className="border-border bg-muted/30 border-t py-20">
          <div className="mx-auto max-w-3xl px-5 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Bring the whole plan into focus
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-xl">
              Create a workspace, invite your team and move your first card across the board in
              under a minute.
            </p>

            <div className="mt-8 flex justify-center">
              <ButtonLink href="/register" size="lg" icon={<ArrowRight />}>
                Create your workspace
              </ButtonLink>
            </div>

            <ul className="text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]">
              {['No credit card', 'Unlimited projects', 'Full audit trail'].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="text-success size-4" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-border border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <Brand size="sm" />
          <p className="text-muted-foreground text-[13px]">
            {APP_TAGLINE} · Built as a full-stack engineering assignment.
          </p>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-[13px] font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
