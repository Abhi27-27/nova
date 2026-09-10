'use client';

import { getInitials, type UserSummary } from '@nova/shared';
import { useState } from 'react';
import { avatarTint } from '@/lib/format';
import { cn } from '@/lib/utils';

const sizes = {
  xs: 'size-5.5 text-[9px]',
  sm: 'size-7 text-[10.5px]',
  md: 'size-9 text-xs',
  lg: 'size-11 text-sm',
  xl: 'size-16 text-lg',
} as const;

export interface AvatarProps {
  user: Pick<UserSummary, 'id' | 'name' | 'avatarUrl'>;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
}

export function Avatar({ user, size = 'md', className, ring }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(user.avatarUrl) && !failed;

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        sizes[size],
        !showImage && avatarTint(user.id || user.name),
        ring && 'ring-card ring-2',
        className,
      )}
      title={user.name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl as string}
          alt={user.name}
          className="size-full object-cover"
          // Falling back to initials keeps the layout intact when a remote avatar
          // 404s, which is the common case for seeded or imported accounts.
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden>{getInitials(user.name)}</span>
      )}
      <span className="sr-only">{user.name}</span>
    </span>
  );
}

export function AvatarGroup({
  users,
  max = 4,
  size = 'sm',
  className,
}: {
  users: Pick<UserSummary, 'id' | 'name' | 'avatarUrl'>[];
  max?: number;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const shown = users.slice(0, max);
  const overflow = users.length - shown.length;

  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {shown.map((user) => (
        <Avatar key={user.id} user={user} size={size} ring />
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            'bg-muted text-muted-foreground ring-card inline-flex items-center justify-center rounded-full font-semibold ring-2',
            sizes[size],
          )}
          title={users
            .slice(max)
            .map((user) => user.name)
            .join(', ')}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
