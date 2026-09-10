'use client';

import { registerSchema, type RegisterInput } from '@nova/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/** Mirrors the server-side policy in `passwordSchema`, shown as you type. */
const RULES = [
  { label: '8+ characters', test: (value: string) => value.length >= 8 },
  { label: 'Lowercase', test: (value: string) => /[a-z]/.test(value) },
  { label: 'Uppercase', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'Number', test: (value: string) => /[0-9]/.test(value) },
];

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, isAuthenticated, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const invitationToken = searchParams.get('invitation') ?? undefined;

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', workspaceName: '' },
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace('/app');
  }, [isAuthenticated, isLoading, router]);

  const password = watch('password') ?? '';
  const satisfied = useMemo(() => RULES.map((rule) => rule.test(password)), [password]);
  const strength = satisfied.filter(Boolean).length;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await signUp({
        name: values.name,
        email: values.email,
        password: values.password,
        // An empty workspace name means "use the default derived from my name".
        ...(values.workspaceName ? { workspaceName: values.workspaceName } : {}),
        ...(invitationToken ? { invitationToken } : {}),
      });

      toast.success('Workspace ready — welcome to NOVA');
      router.replace('/app');
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.details) {
          for (const [field, messages] of Object.entries(error.details)) {
            setError(field as keyof RegisterInput, { message: messages[0] });
          }
        }
        setFormError(error.details ? null : error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
  });

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {invitationToken ? 'Accept your invitation' : 'Create your workspace'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {invitationToken
            ? 'Set up your account to join the team on NOVA.'
            : 'Free to start. Invite your team once you are in.'}
        </p>
      </div>

      {formError ? (
        <div
          role="alert"
          className="border-danger/30 bg-danger-subtle text-danger rounded-lg border px-3.5 py-2.5 text-[13px] font-medium"
        >
          {formError}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Full name" htmlFor="name" error={errors.name?.message} required>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            leading={<User />}
            invalid={Boolean(errors.name)}
            {...register('name')}
          />
        </Field>

        <Field label="Work email" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            leading={<Mail />}
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        {!invitationToken ? (
          <Field
            label="Workspace name"
            htmlFor="workspaceName"
            error={errors.workspaceName?.message}
            description="Optional — we will name it after you if you leave it blank."
          >
            <Input
              id="workspaceName"
              placeholder="Acme Product Team"
              leading={<Building2 />}
              invalid={Boolean(errors.workspaceName)}
              {...register('workspaceName')}
            />
          </Field>
        ) : null}

        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Create a strong password"
            leading={<Lock />}
            invalid={Boolean(errors.password)}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            }
            {...register('password')}
          />
        </Field>

        {password.length > 0 ? (
          <div className="space-y-2">
            <div className="flex gap-1" aria-hidden>
              {RULES.map((rule, index) => (
                <span
                  key={rule.label}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    index < strength
                      ? strength <= 2
                        ? 'bg-danger'
                        : strength === 3
                          ? 'bg-warning'
                          : 'bg-success'
                      : 'bg-muted',
                  )}
                />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {RULES.map((rule, index) => (
                <li
                  key={rule.label}
                  className={cn(
                    'text-[11.5px] font-medium transition-colors',
                    satisfied[index] ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {satisfied[index] ? '✓' : '○'} {rule.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          {invitationToken ? 'Join the workspace' : 'Create workspace'}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-[13.5px]">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
