'use client';

import { PROJECT_ROLES, PROJECT_ROLE_LABELS, type Project, type ProjectRole } from '@nova/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select } from '@/components/ui/form';
import { useWorkspaceDirectory } from '@/hooks/use-workspace-data';
import { ApiClientError } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

/**
 * Project membership.
 *
 * Only workspace members can be added, and the picker reflects that by listing
 * exactly the people who are not on the project yet — so an invalid choice is not
 * offered rather than being rejected after the fact.
 */
export function ProjectMembersPanel({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const { data: directory = [] } = useWorkspaceDirectory();
  const [selectedUserId, setSelectedUserId] = useState('');

  const canManage = project.viewerRole === 'LEAD';

  const available = useMemo(() => {
    const existing = new Set(project.members.map((member) => member.user.id));
    return directory.filter((person) => !existing.has(person.id));
  }, [directory, project.members]);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });

  const onError = (error: unknown) =>
    toast.error(error instanceof ApiClientError ? error.message : 'Something went wrong');

  const addMember = useMutation({
    mutationFn: () => endpoints.projects.addMember(project.id, selectedUserId),
    onSuccess: async () => {
      setSelectedUserId('');
      await refresh();
      toast.success('Added to the project');
    },
    onError,
  });

  const changeRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: ProjectRole }) =>
      endpoints.projects.updateMember(project.id, memberId, role),
    onSuccess: async () => {
      await refresh();
      toast.success('Role updated');
    },
    onError,
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => endpoints.projects.removeMember(project.id, memberId),
    onSuccess: async () => {
      await refresh();
      toast.success('Removed from the project');
    },
    onError,
  });

  return (
    <Card>
      <CardHeader
        title="Project team"
        description={`${project.members.length} ${project.members.length === 1 ? 'person' : 'people'} on this project`}
      />

      <CardContent className="space-y-4 pt-4">
        {canManage ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1">
              <Select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                aria-label="Add a workspace member"
                disabled={available.length === 0}
              >
                <option value="">
                  {available.length === 0
                    ? 'Everyone in the workspace is already here'
                    : 'Add someone from the workspace…'}
                </option>
                {available.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} · {person.email}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              icon={<UserPlus />}
              onClick={() => addMember.mutate()}
              disabled={!selectedUserId}
              loading={addMember.isPending}
            >
              Add
            </Button>
          </div>
        ) : null}

        <ul className="divide-border divide-y">
          {project.members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 py-3">
              <Avatar user={member.user} size="md" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{member.user.name}</p>
                <p className="text-muted-foreground truncate text-[11.5px]">
                  {member.user.email} · joined {formatDate(member.joinedAt)}
                </p>
              </div>

              {canManage ? (
                <Select
                  value={member.role}
                  onChange={(event) =>
                    changeRole.mutate({
                      memberId: member.id,
                      role: event.target.value as ProjectRole,
                    })
                  }
                  aria-label={`Role for ${member.user.name}`}
                  className="w-32"
                >
                  {PROJECT_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {PROJECT_ROLE_LABELS[role]}
                    </option>
                  ))}
                </Select>
              ) : (
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11.5px] font-medium">
                  {PROJECT_ROLE_LABELS[member.role]}
                </span>
              )}

              {canManage ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeMember.mutate(member.id)}
                  aria-label={`Remove ${member.user.name} from the project`}
                  className="text-muted-foreground hover:bg-danger-subtle hover:text-danger"
                >
                  <X />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
