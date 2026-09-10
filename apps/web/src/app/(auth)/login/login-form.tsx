'use client';

import { loginSchema, type LoginInput } from '@nova/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { ApiClientError } from '@/lib/api-client';

const DEMO_ACCOUNTS = [
  { email: 'aarav@novalabs.dev', role: 'Owner' },
  { email: 'meera@novalabs.dev', role: 'Admin' },
  { email: 'daniel@novalabs.dev', role: 'Member' },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isAuthenticated, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nextPath = searchParams.get('next') ?? '/app';

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Someone who is already signed in has no business on this page.
  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace(nextPath);
  }, [isAuthenticated, isLoading, nextPath, router]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const session = await signIn(values.email, values.password);
      toast.success(`Welcome back, ${session.user.name.split(' ')[0]}`);
      router.replace(nextPath);
    } catch (error) {
      if (error instanceof ApiClientError) {
        // Field-level problems go next to the field; anything else is shown once
        // above the form so the message is never lost in a toast.
        if (error.details) {
          for (const [field, messages] of Object.entries(error.details)) {
            setError(field as keyof LoginInput, { message: messages[0] });
          }
        }
        setFormError(error.details ? null : error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
  });

  const useDemoAccount = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Password123', { shouldValidate: true });
    toast.info('Demo credentials filled in — press Sign in.');
  };

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to pick up where your team left off.
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
        <Field label="Email" htmlFor="email" error={errors.email?.message} required>
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

        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Your password"
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

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <div className="border-border bg-muted/40 rounded-xl border p-3.5">
        <p className="text-muted-foreground text-[12px] font-semibold tracking-wide uppercase">
          Demo accounts
        </p>
        <p className="text-muted-foreground mt-1 text-[12.5px]">
          Seeded workspace with four projects and 50+ tasks. Password{' '}
          <code className="bg-card rounded px-1 py-0.5 font-mono text-[11.5px]">Password123</code>.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => useDemoAccount(account.email)}
              className="border-border bg-card hover:border-primary hover:text-primary rounded-md border px-2 py-1 text-[11.5px] font-medium transition-colors"
            >
              {account.role}
            </button>
          ))}
        </div>
      </div>

      <p className="text-muted-foreground text-center text-[13.5px]">
        New to NOVA?{' '}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
