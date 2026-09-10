import { Compass } from 'lucide-react';
import { Brand } from '@/components/brand';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 text-center">
      <Brand size="lg" />

      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
        <Compass className="size-6" aria-hidden />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">This page does not exist</h1>
        <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
          The link may be out of date, or the project or task it pointed at may have been deleted.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <ButtonLink href="/app">Go to dashboard</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
