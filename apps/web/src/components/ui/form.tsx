'use client';

import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

const control =
  'w-full rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/70 ' +
  'transition-[border-color,box-shadow] duration-150 outline-none ' +
  'focus:border-primary focus:ring-3 focus:ring-primary/15 ' +
  'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground';

const invalid = 'border-danger focus:border-danger focus:ring-danger/15';

/**
 * `Field` owns the label, description, error text and — crucially — the wiring
 * between them: the control gets `aria-describedby` and `aria-invalid` for free,
 * so accessibility does not depend on remembering it at each call site.
 */
export interface FieldProps {
  label?: string;
  htmlFor?: string;
  error?: string | undefined;
  description?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  error,
  description,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="text-foreground flex items-center gap-1 text-[13px] font-medium"
        >
          {label}
          {required ? (
            <span className="text-danger" aria-hidden>
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {children}

      {error ? (
        <p className="text-danger flex items-start gap-1.5 text-[12.5px] font-medium" role="alert">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : description ? (
        <p className="text-muted-foreground text-[12.5px]">{description}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid: isInvalid, leading, trailing, ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      className={cn(
        control,
        'h-9.5 px-3 text-sm',
        leading && 'pl-9',
        trailing && 'pr-9',
        isInvalid && invalid,
        className,
      )}
      aria-invalid={isInvalid || undefined}
      {...props}
    />
  );

  if (!leading && !trailing) return field;

  return (
    <div className="relative">
      {leading ? (
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 [&_svg]:size-4">
          {leading}
        </span>
      ) : null}
      {field}
      {trailing ? (
        <span className="text-muted-foreground absolute top-1/2 right-2.5 -translate-y-1/2 [&_svg]:size-4">
          {trailing}
        </span>
      ) : null}
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid: isInvalid, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        control,
        'resize-y px-3 py-2 text-sm leading-relaxed',
        isInvalid && invalid,
        className,
      )}
      aria-invalid={isInvalid || undefined}
      {...props}
    />
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/**
 * A native `<select>`, restyled.
 *
 * Native beats a custom listbox here: it is keyboard accessible, screen-reader
 * correct and renders as a proper picker on mobile — none of which a hand-rolled
 * dropdown gets for free.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid: isInvalid, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          control,
          'h-9.5 cursor-pointer appearance-none py-0 pr-9 pl-3 text-sm',
          isInvalid && invalid,
          className,
        )}
        aria-invalid={isInvalid || undefined}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
        aria-hidden
      />
    </div>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const generated = useId();
  const inputId = id ?? generated;

  return (
    <div className="flex items-center gap-2.5">
      <span className="relative inline-flex">
        <input
          id={inputId}
          type="checkbox"
          className={cn(
            'peer border-border bg-card size-4.5 cursor-pointer appearance-none rounded-[5px] border',
            'checked:border-primary checked:bg-primary transition-colors',
            'focus-visible:ring-primary/20 focus-visible:ring-3',
            className,
          )}
          {...props}
        />
        <Check
          className="text-primary-foreground pointer-events-none absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100"
          strokeWidth={3}
          aria-hidden
        />
      </span>
      {label ? (
        <label htmlFor={inputId} className="text-foreground cursor-pointer text-sm">
          {label}
        </label>
      ) : null}
    </div>
  );
}

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  id,
}: SwitchProps) {
  const generated = useId();
  const switchId = id ?? generated;

  return (
    <div className="flex items-start justify-between gap-4">
      {label ? (
        <div className="space-y-0.5">
          <label htmlFor={switchId} className="text-foreground text-sm font-medium">
            {label}
          </label>
          {description ? (
            <p className="text-muted-foreground text-[12.5px]">{description}</p>
          ) : null}
        </div>
      ) : null}

      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'shadow-subtle inline-block size-4.5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
