'use client';

import type { Notification } from '@nova/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Menu } from '@/components/ui/menu';
import { formatRelative } from '@/lib/format';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const TYPE_TONE: Record<Notification['type'], string> = {
  TASK_ASSIGNED: 'bg-primary',
  TASK_STATUS_CHANGED: 'bg-status-progress',
  TASK_DUE_SOON: 'bg-warning',
  COMMENT_MENTION: 'bg-info',
  COMMENT_ON_TASK: 'bg-info',
  PROJECT_INVITE: 'bg-success',
  WORKSPACE_INVITE: 'bg-success',
};

export function NotificationsMenu() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data } = useQuery({
    queryKey: queryKeys.notifications.list({ pageSize: 12 }),
    queryFn: () => endpoints.notifications.list({ pageSize: 12 }),
    // Polling keeps the badge honest without the complexity of a socket layer.
    refetchInterval: 60_000,
  });

  const unread = data?.unreadCount ?? 0;

  const markRead = useMutation({
    mutationFn: (notificationId: string) => endpoints.notifications.markRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });

  const markAllRead = useMutation({
    mutationFn: () => endpoints.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });

  const open = (notification: Notification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    if (notification.link) router.push(notification.link);
  };

  return (
    <Menu
      className="w-80 p-0"
      trigger={
        <span
          className="text-muted-foreground hover:bg-muted hover:text-foreground relative inline-flex size-8 items-center justify-center rounded-md transition-colors"
          role="presentation"
        >
          <Bell className="size-4" aria-hidden />
          {unread > 0 ? (
            <span className="bg-danger absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[9.5px] leading-4 font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
          <span className="sr-only">Notifications{unread > 0 ? `, ${unread} unread` : ''}</span>
        </span>
      }
    >
      <div className="border-border flex items-center justify-between border-b px-3.5 py-2.5">
        <p className="text-[13px] font-semibold">Notifications</p>
        {unread > 0 ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              markAllRead.mutate();
            }}
            className="text-primary inline-flex items-center gap-1 text-[11.5px] font-medium hover:underline"
          >
            <CheckCheck className="size-3.5" aria-hidden />
            Mark all read
          </button>
        ) : null}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {!data || data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Inbox className="text-muted-foreground size-6" aria-hidden />
            <p className="text-[13px] font-medium">You are all caught up</p>
            <p className="text-muted-foreground text-[12px]">
              Assignments and replies will show up here.
            </p>
          </div>
        ) : (
          data.items.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => open(notification)}
              className={cn(
                'border-border/70 hover:bg-muted flex w-full gap-2.5 border-b px-3.5 py-2.5 text-left transition-colors last:border-0',
                !notification.readAt && 'bg-primary-subtle/40',
              )}
            >
              <span
                className={cn(
                  'mt-1.5 size-1.5 shrink-0 rounded-full',
                  TYPE_TONE[notification.type],
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] leading-snug font-medium">
                  {notification.title}
                </span>
                {notification.body ? (
                  <span className="text-muted-foreground mt-0.5 block truncate text-[11.5px]">
                    {notification.body}
                  </span>
                ) : null}
                <span className="text-muted-foreground mt-1 block text-[10.5px]">
                  {formatRelative(notification.createdAt)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </Menu>
  );
}
