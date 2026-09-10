'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ApiClientError } from '@/lib/api-client';
import { AuthProvider } from './auth-provider';
import { WorkspaceProvider } from './workspace-provider';

/**
 * Application providers.
 *
 * The QueryClient is created inside state rather than at module scope: at module
 * scope a single client would be shared across every request during SSR, leaking
 * one user's cached data into another's render.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Retrying a 4xx just repeats a request the server already rejected.
              if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthProvider>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </AuthProvider>

        <Toaster
          position="bottom-right"
          closeButton
          richColors
          toastOptions={{
            classNames: {
              toast: 'rounded-xl border border-border bg-card text-foreground shadow-raised',
              description: 'text-muted-foreground',
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
