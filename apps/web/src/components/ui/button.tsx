'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-150 select-none ' +
  'disabled:pointer-events-none disabled:opacity-50 active:translate-y-px ' +
  '[&_svg]:pointer-events-none [&_svg]:shrink-0';

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-subtle hover:bg-primary-hover hover:shadow-card',
  secondary: 'bg-card text-foreground border border-border shadow-subtle hover:bg-muted',
  outline: 'border border-border text-foreground hover:bg-muted',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  subtle: 'bg-primary-subtle text-primary hover:bg-primary-subtle/70',
  danger: 'bg-danger text-white shadow-subtle hover:brightness-110',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 rounded-md px-3 text-[13px] [&_svg]:size-3.5',
  md: 'h-9.5 rounded-lg px-4 text-sm [&_svg]:size-4',
  lg: 'h-11 rounded-lg px-6 text-[15px] [&_svg]:size-4.5',
  icon: 'size-9.5 rounded-lg [&_svg]:size-4',
  'icon-sm': 'size-8 rounded-md [&_svg]:size-4',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and blocks interaction while an action is in flight. */
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      // Announced to assistive tech, so a spinner is not the only signal.
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export interface ButtonLinkProps {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  icon?: ReactNode;
  children?: ReactNode;
  target?: string;
  rel?: string;
}

/** A link that looks like a button, without losing link semantics. */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  icon,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
