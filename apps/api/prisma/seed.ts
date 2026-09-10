/**
 * Demo data for NOVA.
 *
 * The point of this seed is not "some rows exist" — it is that every screen in the
 * product has something honest to show: a board with cards in every column, a
 * throughput chart with a real shape, workload spread unevenly across the team, a
 * few genuinely overdue items, and an activity feed that reads like a week of work.
 *
 * Safe to re-run: it clears the demo workspace first.
 */
import {
  PrismaClient,
  type Prisma,
  type ProjectStatus,
  type TaskPriority,
  type TaskStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Password123';
const WORKSPACE_SLUG = 'nova-labs';

/** Deterministic PRNG so a re-seed produces the same demo, not a different one. */
let seedState = 20260910;
function random(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

function chance(probability: number): boolean {
  return random() < probability;
}

function daysAgo(days: number, hour = 10): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, Math.floor(random() * 60), 0, 0);
  return date;
}

function daysAhead(days: number): Date {
  return daysAgo(-days, 17);
}

const PEOPLE = [
  { name: 'Aarav Sharma', email: 'aarav@novalabs.dev', jobTitle: 'Head of Product', role: 'OWNER' },
  { name: 'Meera Iyer', email: 'meera@novalabs.dev', jobTitle: 'Engineering Lead', role: 'ADMIN' },
  {
    name: 'Daniel Okafor',
    email: 'daniel@novalabs.dev',
    jobTitle: 'Senior Engineer',
    role: 'MEMBER',
  },
  {
    name: 'Sofia Rossi',
    email: 'sofia@novalabs.dev',
    jobTitle: 'Product Designer',
    role: 'MEMBER',
  },
  {
    name: 'Kenji Tanaka',
    email: 'kenji@novalabs.dev',
    jobTitle: 'Backend Engineer',
    role: 'MEMBER',
  },
  { name: 'Priya Nair', email: 'priya@novalabs.dev', jobTitle: 'QA Engineer', role: 'MEMBER' },
] as const;

const LABELS = [
  { name: 'Bug', color: '#ef4444' },
  { name: 'Feature', color: '#6366f1' },
  { name: 'Improvement', color: '#10b981' },
  { name: 'Design', color: '#ec4899' },
  { name: 'Documentation', color: '#f59e0b' },
  { name: 'Infrastructure', color: '#06b6d4' },
  { name: 'Security', color: '#8b5cf6' },
];

interface ProjectBlueprint {
  name: string;
  key: string;
  description: string;
  status: ProjectStatus;
  color: string;
  startOffset: number;
  dueOffset: number;
  titles: string[];
}

const PROJECTS: ProjectBlueprint[] = [
  {
    name: 'Apollo Web Platform',
    key: 'APL',
    description:
      'Rebuild of the customer-facing web application on the new design system, including the onboarding flow and billing screens.',
    status: 'ACTIVE',
    color: '#6366f1',
    startOffset: 44,
    dueOffset: 30,
    titles: [
      'Design token pipeline for light and dark themes',
      'Rebuild the onboarding wizard',
      'Billing page: annual and monthly toggle',
      'Fix layout shift on the pricing table',
      'Add empty states to the projects list',
      'Server-side render the marketing pages',
      'Accessibility audit of the primary navigation',
      'Replace legacy modal component',
      'Instrument funnel analytics events',
      'Reduce first-load JavaScript below 120kb',
      'Keyboard shortcuts for the command palette',
      'Handle expired-session redirects gracefully',
      'Write migration guide for the old dashboard',
      'Skeleton loaders for slow connections',
      'Fix avatar upload on Safari',
      'Dark mode contrast fixes on charts',
      'Add breadcrumb navigation to settings',
      'Localise date formatting per user timezone',
    ],
  },
  {
    name: 'Atlas API Services',
    key: 'ATL',
    description:
      'Public REST API: versioning, rate limiting, documentation and the migration off the legacy monolith endpoints.',
    status: 'ACTIVE',
    color: '#06b6d4',
    startOffset: 60,
    dueOffset: 45,
    titles: [
      'Introduce cursor pagination on list endpoints',
      'Per-account rate limiting with burst allowance',
      'Publish OpenAPI 3.1 document',
      'Deprecate v0 authentication endpoints',
      'Structured request logging with correlation ids',
      'Idempotency keys for write endpoints',
      'Database connection pooling under load',
      'Webhook delivery with exponential backoff',
      'Audit trail for permission changes',
      'Fix N+1 query on the projects endpoint',
      'Rotate refresh tokens on every exchange',
      'Contract tests against the staging environment',
      'Return machine-readable error codes',
      'Cache workspace membership lookups',
      'Harden CORS configuration for production',
      'Backfill missing created_at values',
    ],
  },
  {
    name: 'Orion Mobile',
    key: 'ORN',
    description:
      'Companion mobile application: offline task capture, push notifications and biometric sign-in.',
    status: 'PLANNING',
    color: '#f59e0b',
    startOffset: 12,
    dueOffset: 74,
    titles: [
      'Technical spike: offline-first sync strategy',
      'Design the mobile board interaction',
      'Push notification permissions flow',
      'Biometric unlock on iOS and Android',
      'Offline queue for task edits',
      'Shrink the initial bundle for slow networks',
      'Crash reporting and release health',
      'Deep links into task detail',
      'Accessibility pass on touch targets',
      'App store listing and screenshots',
    ],
  },
  {
    name: 'Helios Data Migration',
    key: 'HEL',
    description:
      'One-off migration of historical projects and tasks from the legacy tracker, with verification and rollback plan.',
    status: 'COMPLETED',
    color: '#10b981',
    startOffset: 90,
    dueOffset: -12,
    titles: [
      'Map legacy statuses onto the new workflow',
      'Export historical tasks to staging',
      'Reconcile duplicate user accounts',
      'Verify comment threading after import',
      'Dry run against a production snapshot',
      'Cut over and freeze the legacy tracker',
      'Archive the legacy database',
      'Post-migration data quality report',
    ],
  },
];

const COMMENTS = [
  'Picking this up now — should have something to review by tomorrow.',
  'Blocked on the design review. @Sofia, is the latest spec final?',
  'Reproduced on staging. It only happens when the workspace has more than 50 projects.',
  'Nice catch. I have pushed a fix and added a regression test.',
  'Moving this to review — the migration ran clean against a production snapshot.',
  'Do we need this before the release, or can it wait for the next cycle?',
  'Confirmed fixed in the latest build. Closing after QA signs off.',
  'I have split the larger piece out into a separate task so this one can land.',
  'Left a few comments on the pull request, nothing blocking.',
  'This turned out to be a caching issue rather than a query problem.',
];

const STATUS_WEIGHTS: { status: TaskStatus; weight: number }[] = [
  { status: 'BACKLOG', weight: 0.24 },
  { status: 'TODO', weight: 0.2 },
  { status: 'IN_PROGRESS', weight: 0.14 },
  { status: 'IN_REVIEW', weight: 0.1 },
  { status: 'DONE', weight: 0.32 },
];

function weightedStatus(): TaskStatus {
  const roll = random();
  let cumulative = 0;
  for (const entry of STATUS_WEIGHTS) {
    cumulative += entry.weight;
    if (roll <= cumulative) return entry.status;
  }
  return 'TODO';
}

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'HIGH', 'URGENT'];

async function main(): Promise<void> {
  console.log('\nSeeding NOVA demo data...\n');

  // Re-runnable: drop the demo workspace, then rebuild it. Cascades clear projects,
  // tasks, comments and activity along with it.
  await prisma.workspace.deleteMany({ where: { slug: WORKSPACE_SLUG } });

  const passwordHash = await hash(SEED_PASSWORD, 10);

  const users = [];
  for (const person of PEOPLE) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: { name: person.name, jobTitle: person.jobTitle, passwordHash },
      create: {
        email: person.email,
        name: person.name,
        jobTitle: person.jobTitle,
        timezone: 'Asia/Kolkata',
        passwordHash,
      },
      select: { id: true, name: true, email: true },
    });
    users.push({ ...user, role: person.role });
  }

  const owner = users[0]!;

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Nova Labs',
      slug: WORKSPACE_SLUG,
      description: 'Product, engineering and design working out of one place.',
      members: {
        create: users.map((user, index) => ({
          userId: user.id,
          role: user.role,
          joinedAt: daysAgo(90 - index * 6),
        })),
      },
      labels: { createMany: { data: LABELS } },
    },
    select: { id: true },
  });

  const labels = await prisma.label.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true },
  });

  const activityRows: Prisma.ActivityCreateManyInput[] = [];
  const notificationRows: Prisma.NotificationCreateManyInput[] = [];
  let totalTasks = 0;
  let totalComments = 0;

  for (const blueprint of PROJECTS) {
    const memberCount = 3 + Math.floor(random() * 3);
    const projectMembers = users.slice(0, memberCount);

    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: blueprint.name,
        key: blueprint.key,
        description: blueprint.description,
        status: blueprint.status,
        color: blueprint.color,
        startDate: daysAgo(blueprint.startOffset),
        dueDate: daysAhead(blueprint.dueOffset),
        createdById: owner.id,
        createdAt: daysAgo(blueprint.startOffset),
        taskCounter: blueprint.titles.length,
        members: {
          create: projectMembers.map((user, index) => ({
            userId: user.id,
            role: index === 0 ? 'LEAD' : index === 1 ? 'LEAD' : 'MEMBER',
            joinedAt: daysAgo(blueprint.startOffset - index),
          })),
        },
      },
      select: { id: true, key: true, name: true },
    });

    activityRows.push({
      workspaceId: workspace.id,
      projectId: project.id,
      actorId: owner.id,
      type: 'PROJECT_CREATED',
      metadata: { name: project.name, key: project.key },
      createdAt: daysAgo(blueprint.startOffset),
    });

    let position = 0;

    for (const [index, title] of blueprint.titles.entries()) {
      // Completed projects are fully done; live projects get a realistic spread.
      const status: TaskStatus = blueprint.status === 'COMPLETED' ? 'DONE' : weightedStatus();
      const assignee = chance(0.85) ? pick(projectMembers) : null;
      const createdAt = daysAgo(Math.max(1, blueprint.startOffset - Math.floor(random() * 30)));
      const isDone = status === 'DONE';

      // Completion dates land inside the last 30 days so the throughput chart has
      // a genuine shape rather than a flat line.
      const completedAt = isDone ? daysAgo(Math.floor(random() * 28) + 1, 15) : null;

      const dueDate = chance(0.75)
        ? isDone
          ? daysAgo(Math.floor(random() * 20))
          : chance(0.22)
            ? daysAgo(Math.floor(random() * 9) + 1) // deliberately overdue
            : daysAhead(Math.floor(random() * 26) + 1)
        : null;

      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          number: index + 1,
          title,
          description: chance(0.7)
            ? `${title}.\n\nAcceptance criteria are tracked in the linked spec. Ping the project lead if anything here is ambiguous before starting work.`
            : null,
          status,
          priority: pick(PRIORITIES),
          position,
          estimateHours: chance(0.55) ? Math.round((random() * 14 + 1) * 2) / 2 : null,
          startDate: chance(0.4) ? createdAt : null,
          dueDate,
          completedAt,
          assigneeId: assignee?.id ?? null,
          createdById: pick(projectMembers).id,
          createdAt,
          labels: {
            createMany: {
              data: Array.from(
                new Set([pick(labels).id, ...(chance(0.35) ? [pick(labels).id] : [])]),
              ).map((labelId) => ({ labelId })),
            },
          },
        },
        select: { id: true, number: true, title: true, assigneeId: true },
      });

      position += 1024;
      totalTasks += 1;

      const reference = `${project.key}-${task.number}`;

      activityRows.push({
        workspaceId: workspace.id,
        projectId: project.id,
        taskId: task.id,
        actorId: pick(projectMembers).id,
        type: 'TASK_CREATED',
        metadata: { reference, title: task.title },
        createdAt,
      });

      if (isDone && completedAt) {
        activityRows.push({
          workspaceId: workspace.id,
          projectId: project.id,
          taskId: task.id,
          actorId: assignee?.id ?? owner.id,
          type: 'TASK_COMPLETED',
          metadata: { reference, title: task.title, from: 'In Review', to: 'Done' },
          createdAt: completedAt,
        });
      }

      if (chance(0.45)) {
        const commentCount = 1 + Math.floor(random() * 2);
        for (let n = 0; n < commentCount; n += 1) {
          const author = pick(projectMembers);
          const commentedAt = daysAgo(Math.floor(random() * 14) + 1, 12 + n);

          await prisma.comment.create({
            data: {
              taskId: task.id,
              authorId: author.id,
              body: pick(COMMENTS),
              createdAt: commentedAt,
              updatedAt: commentedAt,
            },
          });

          totalComments += 1;

          activityRows.push({
            workspaceId: workspace.id,
            projectId: project.id,
            taskId: task.id,
            actorId: author.id,
            type: 'COMMENT_CREATED',
            metadata: { reference, title: task.title },
            createdAt: commentedAt,
          });
        }
      }

      // A handful of unread notifications for the demo account.
      if (task.assigneeId && task.assigneeId !== owner.id && chance(0.12)) {
        notificationRows.push({
          userId: task.assigneeId,
          type: 'TASK_ASSIGNED',
          title: `${reference} was assigned to you`,
          body: task.title,
          link: `/app/tasks/${task.id}`,
          createdAt: daysAgo(Math.floor(random() * 6) + 1),
        });
      }

      if (task.assigneeId !== owner.id && chance(0.1)) {
        notificationRows.push({
          userId: owner.id,
          type: 'COMMENT_ON_TASK',
          title: `New comment on ${reference}`,
          body: pick(COMMENTS).slice(0, 120),
          link: `/app/tasks/${task.id}`,
          createdAt: daysAgo(Math.floor(random() * 5) + 1),
        });
      }
    }
  }

  await prisma.activity.createMany({ data: activityRows });
  await prisma.notification.createMany({ data: notificationRows });

  console.log(`  Workspace     Nova Labs (${WORKSPACE_SLUG})`);
  console.log(`  Members       ${users.length}`);
  console.log(`  Projects      ${PROJECTS.length}`);
  console.log(`  Tasks         ${totalTasks}`);
  console.log(`  Comments      ${totalComments}`);
  console.log(`  Activity      ${activityRows.length}`);
  console.log(`  Notifications ${notificationRows.length}`);
  console.log('\n  Sign in with any of these accounts:');
  for (const user of users) {
    console.log(`    ${user.email.padEnd(26)} ${SEED_PASSWORD}   (${user.role})`);
  }
  console.log('');
}

main()
  .catch((error) => {
    console.error('\nSeeding failed:\n', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
