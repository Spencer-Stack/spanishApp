import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-neutral-900 text-neutral-0 border border-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:border-neutral-300',
  secondary:
    'bg-neutral-0 text-neutral-800 border border-neutral-200 hover:bg-neutral-50 disabled:text-neutral-300',
  ghost:
    'bg-transparent text-neutral-600 border border-transparent hover:bg-neutral-100 disabled:text-neutral-300',
  danger:
    'bg-neutral-0 text-accent-red border border-neutral-200 hover:bg-neutral-100 disabled:text-neutral-300',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'secondary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
