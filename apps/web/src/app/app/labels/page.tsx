'use client';

import { COLOR_PALETTE, type Label } from '@nova/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { LabelChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, PageHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { ApiClientError } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

export default function LabelsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Label | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Label | null>(null);

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(COLOR_PALETTE[0]);
  const [error, setError] = useState<string | null>(null);

  const {
    data: labels = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.labels.list(),
    queryFn: () => endpoints.labels.list(),
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.labels.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
    ]);

  const openCreate = () => {
    setName('');
    setColor(COLOR_PALETTE[0]);
    setError(null);
    setCreating(true);
  };

  const openEdit = (label: Label) => {
    setName(label.name);
    setColor(label.color);
    setError(null);
    setEditing(label);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const onError = (err: unknown) => {
    if (err instanceof ApiClientError) setError(err.fieldError('name') ?? err.message);
    else setError('Something went wrong');
  };

  const createLabel = useMutation({
    mutationFn: () => endpoints.labels.create({ name: name.trim(), color }),
    onSuccess: async () => {
      await refresh();
      close();
      toast.success('Label created');
    },
    onError,
  });

  const updateLabel = useMutation({
    mutationFn: () => endpoints.labels.update(editing!.id, { name: name.trim(), color }),
    onSuccess: async () => {
      await refresh();
      close();
      toast.success('Label updated');
    },
    onError,
  });

  const deleteLabel = useMutation({
    mutationFn: (labelId: string) => endpoints.labels.remove(labelId),
    onSuccess: async () => {
      setRemoving(null);
      await refresh();
      toast.success('Label deleted');
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : 'Could not delete the label'),
  });

  const submit = () => {
    if (name.trim().length === 0) {
      setError('Enter a label name');
      return;
    }
    if (editing) updateLabel.mutate();
    else createLabel.mutate();
  };

  const dialogOpen = creating || editing !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labels"
        description="Shared across every project in this workspace, so filters work everywhere."
        action={
          <Button icon={<Plus />} onClick={openCreate}>
            New label
          </Button>
        }
      />

      {isError ? (
        <ErrorState
          title="Could not load labels"
          message="The request to the API failed."
          onRetry={() => void refetch()}
        />
      ) : (
        <Card>
          <CardHeader
            title="All labels"
            description={`${labels.length} ${labels.length === 1 ? 'label' : 'labels'}`}
          />

          <CardContent className="pt-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : labels.length === 0 ? (
              <EmptyState
                icon={<Tags />}
                title="No labels yet"
                description="Labels let you slice work across projects — bugs, design, infrastructure, whatever fits how your team thinks."
                action={
                  <Button icon={<Plus />} onClick={openCreate}>
                    Create a label
                  </Button>
                }
              />
            ) : (
              <ul className="divide-border divide-y">
                {labels.map((label) => (
                  <li key={label.id} className="flex items-center gap-3 py-3">
                    <LabelChip name={label.name} color={label.color} />

                    <span className="text-muted-foreground text-[12px]">
                      {label.taskCount ?? 0} {label.taskCount === 1 ? 'task' : 'tasks'}
                    </span>

                    <span className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(label)}
                        aria-label={`Edit ${label.name}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRemoving(label)}
                        aria-label={`Delete ${label.name}`}
                        className="text-muted-foreground hover:bg-danger-subtle hover:text-danger"
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        open={dialogOpen}
        onClose={close}
        title={editing ? 'Edit label' : 'New label'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit} loading={createLabel.isPending || updateLabel.isPending}>
              {editing ? 'Save changes' : 'Create label'}
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field label="Name" htmlFor="label-name" required error={error ?? undefined}>
            <Input
              id="label-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder="e.g. Infrastructure"
              maxLength={32}
              invalid={Boolean(error)}
              autoFocus
            />
          </Field>

          <Field label="Colour">
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  aria-label={`Use colour ${option}`}
                  aria-pressed={color === option}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-lg transition-transform hover:scale-110',
                    color === option && 'ring-ring ring-offset-card ring-2 ring-offset-2',
                  )}
                  style={{ backgroundColor: option }}
                >
                  {color === option ? (
                    <Check className="size-3.5 text-white" strokeWidth={3} aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>
          </Field>

          <div className="border-border bg-muted/40 rounded-lg border p-3">
            <p className="text-muted-foreground mb-2 text-[11.5px] font-medium">Preview</p>
            <LabelChip name={name.trim() || 'Label name'} color={color} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && deleteLabel.mutate(removing.id)}
        loading={deleteLabel.isPending}
        title={`Delete “${removing?.name ?? ''}”?`}
        message={`The label is removed from ${removing?.taskCount ?? 0} ${
          removing?.taskCount === 1 ? 'task' : 'tasks'
        }. The tasks themselves are not affected.`}
        confirmLabel="Delete label"
      />
    </div>
  );
}
