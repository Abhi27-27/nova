'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { TaskDetail } from '@/components/tasks/task-detail';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Standalone task page.
 *
 * Notifications and the activity feed link straight here, so a task is
 * addressable on its own rather than only reachable through a board.
 */
export default function TaskPage() {
  const params = useParams<{ taskId: string }>();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/app/tasks"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-colors"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        All tasks
      </Link>

      <Card>
        <CardContent>
          <TaskDetail taskId={params.taskId} onDeleted={() => router.push('/app/tasks')} />
        </CardContent>
      </Card>
    </div>
  );
}
