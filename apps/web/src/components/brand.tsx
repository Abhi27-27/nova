import Link from 'next/link';
import { cn } from '@/lib/utils';

const sizes = {
  sm: { box: 'size-7 rounded-lg', mark: 'size-4', text: 'text-[15px]' },
  md: { box: 'size-9 rounded-xl', mark: 'size-5', text: 'text-lg' },
  lg: { box: 'size-11 rounded-xl', mark: 'size-6', text: 'text-xl' },
} as const;

/** The NOVA mark: an "N" drawn as a rising path — plan, collaborate, deliver. */
export function Logomark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M6 18V6l12 12V6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Brand({
  size = 'md',
  href = '/',
  showWordmark = true,
  className,
}: {
  size?: keyof typeof sizes;
  href?: string | null;
  showWordmark?: boolean;
  className?: string;
}) {
  const style = sizes[size];

  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'bg-primary text-primary-foreground shadow-subtle inline-flex items-center justify-center',
          style.box,
        )}
      >
        <Logomark className={style.mark} />
      </span>
      {showWordmark ? (
        <span className={cn('font-semibold tracking-tight', style.text)}>NOVA</span>
      ) : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex rounded-lg" aria-label="NOVA home">
      {content}
    </Link>
  );
}
