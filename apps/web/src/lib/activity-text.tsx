import type { Activity } from '@nova/shared';
import {
  CheckCircle2,
  FolderPlus,
  MessageSquare,
  Pencil,
  RotateCcw,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Turns an activity row into a sentence a person can read.
 *
 * The feed is written in past tense with the actor's name supplied separately, so
 * each entry reads as "Meera moved APL-12 to In Review".
 */
export interface ActivityDescription {
  icon: LucideIcon;
  tone: string;
  text: string;
}

function metaString(activity: Activity, key: string): string | null {
  const value = activity.metadata[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function describeActivity(activity: Activity): ActivityDescription {
  const reference = activity.context.taskReference ?? metaString(activity, 'reference') ?? 'a task';
  const project = activity.context.projectName ?? metaString(activity, 'name') ?? 'a project';
  const from = metaString(activity, 'from');
  const to = metaString(activity, 'to');

  switch (activity.type) {
    case 'PROJECT_CREATED':
      return {
        icon: FolderPlus,
        tone: 'text-primary bg-primary-subtle',
        text: `created the project ${project}`,
      };
    case 'PROJECT_UPDATED':
      return { icon: Pencil, tone: 'text-info bg-info-subtle', text: `updated ${project}` };
    case 'PROJECT_ARCHIVED':
      return { icon: Trash2, tone: 'text-muted-foreground bg-muted', text: `archived ${project}` };

    case 'TASK_CREATED':
      return { icon: Zap, tone: 'text-primary bg-primary-subtle', text: `created ${reference}` };
    case 'TASK_UPDATED':
      return { icon: Pencil, tone: 'text-info bg-info-subtle', text: `updated ${reference}` };
    case 'TASK_STATUS_CHANGED':
      return {
        icon: RotateCcw,
        tone: 'text-status-progress bg-warning-subtle',
        text: from && to ? `moved ${reference} from ${from} to ${to}` : `moved ${reference}`,
      };
    case 'TASK_COMPLETED':
      return {
        icon: CheckCircle2,
        tone: 'text-success bg-success-subtle',
        text: `completed ${reference}`,
      };
    case 'TASK_REOPENED':
      return {
        icon: RotateCcw,
        tone: 'text-warning bg-warning-subtle',
        text: `reopened ${reference}`,
      };
    case 'TASK_ASSIGNED': {
      const assignee = metaString(activity, 'assigneeName');
      return {
        icon: UserPlus,
        tone: 'text-info bg-info-subtle',
        text: assignee ? `assigned ${reference} to ${assignee}` : `assigned ${reference}`,
      };
    }
    case 'TASK_UNASSIGNED':
      return {
        icon: UserMinus,
        tone: 'text-muted-foreground bg-muted',
        text: `unassigned ${reference}`,
      };
    case 'TASK_PRIORITY_CHANGED':
      return {
        icon: Zap,
        tone: 'text-warning bg-warning-subtle',
        text:
          from && to
            ? `changed ${reference} priority from ${from} to ${to}`
            : `changed the priority of ${reference}`,
      };
    case 'TASK_DELETED':
      return { icon: Trash2, tone: 'text-danger bg-danger-subtle', text: `deleted ${reference}` };

    case 'COMMENT_CREATED':
      return {
        icon: MessageSquare,
        tone: 'text-info bg-info-subtle',
        text: `commented on ${reference}`,
      };
    case 'COMMENT_DELETED':
      return {
        icon: Trash2,
        tone: 'text-muted-foreground bg-muted',
        text: `deleted a comment on ${reference}`,
      };

    case 'MEMBER_JOINED':
      return {
        icon: Users,
        tone: 'text-success bg-success-subtle',
        text: metaString(activity, 'memberName')
          ? `added ${metaString(activity, 'memberName')} to the workspace`
          : 'joined the workspace',
      };
    case 'MEMBER_INVITED':
      return {
        icon: UserPlus,
        tone: 'text-primary bg-primary-subtle',
        text: `invited ${metaString(activity, 'email') ?? 'someone'} to the workspace`,
      };
    case 'MEMBER_ROLE_CHANGED':
      return {
        icon: Users,
        tone: 'text-info bg-info-subtle',
        text: `changed ${metaString(activity, 'memberName') ?? 'a member'}'s role${to ? ` to ${to}` : ''}`,
      };
    case 'MEMBER_REMOVED':
      return {
        icon: UserMinus,
        tone: 'text-danger bg-danger-subtle',
        text: `removed ${metaString(activity, 'memberName') ?? 'a member'} from the workspace`,
      };

    default:
      return { icon: Zap, tone: 'text-muted-foreground bg-muted', text: 'made a change' };
  }
}
