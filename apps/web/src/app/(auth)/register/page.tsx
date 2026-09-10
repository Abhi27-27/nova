import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Create your workspace',
  description: 'Create a NOVA account and start planning with your team.',
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="skeleton h-[30rem] rounded-xl" />}>
      <RegisterForm />
    </Suspense>
  );
}
