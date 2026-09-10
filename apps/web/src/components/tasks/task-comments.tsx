'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { ApiClientError } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { formatRelative } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

export function TaskComments({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.comments.list(taskId),
    queryFn: () => endpoints.comments.list(taskId, { pageSize: 100 }),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.list(taskId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
    ]);
  };

  const addComment = useMutation({
    mutationFn: () => endpoints.comments.create(taskId, { body: body.trim() }),
    onSuccess: async () => {
      setBody('');
      await refresh();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : 'Could not post the comment'),
  });

  const removeComment = useMutation({
    mutationFn: (commentId: string) => endpoints.comments.remove(commentId),
    onSuccess: async () => {
      await refresh();
      toast.success('Comment deleted');
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : 'Could not delete the comment'),
  });

  const submit = () => {
    if (body.trim().length === 0) return;
    addComment.mutate();
  };

  const comments = data?.items ?? [];

  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold">
        <MessageSquare className="text-muted-foreground size-4" aria-hidden />
        Comments
        {comments.length > 0 ? (
          <span className="text-muted-foreground">({comments.length})</span>
        ) : null}
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-16 flex-1" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          title="No comments yet"
          description="Start the conversation — everyone watching this task will be notified."
          className="py-8"
        />
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar user={comment.author} size="md" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold">{comment.author.name}</span>
                  <time
                    className="text-muted-foreground text-[11.5px]"
                    dateTime={comment.createdAt}
                  >
                    {formatRelative(comment.createdAt)}
                  </time>
                  {comment.isEdited ? (
                    <span className="text-muted-foreground text-[11px]">(edited)</span>
                  ) : null}

                  {comment.author.id === user?.id ? (
                    <button
                      type="button"
                      onClick={() => removeComment.mutate(comment.id)}
                      className="text-muted-foreground hover:bg-danger-subtle hover:text-danger ml-auto rounded p-1 transition-colors"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  ) : null}
                </div>

                <p className="bg-muted/60 mt-1 rounded-lg px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap">
                  {comment.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <div className="flex gap-3">
          <Avatar user={user} size="md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              // Enter sends, Shift+Enter adds a line — the convention people already
              // have in their fingers from every other chat surface.
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Write a comment…  (Enter to send, Shift+Enter for a new line)"
              rows={3}
              maxLength={5000}
            />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">
                {body.length > 4500 ? `${5000 - body.length} characters left` : ''}
              </span>
              <Button
                size="sm"
                icon={<Send />}
                onClick={submit}
                loading={addComment.isPending}
                disabled={body.trim().length === 0}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
