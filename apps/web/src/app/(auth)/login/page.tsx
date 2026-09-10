import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your NOVA workspace.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-xl" />}>
      <LoginForm />
    </Suspense>
  );
}
