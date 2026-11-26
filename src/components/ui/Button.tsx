import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none touch-target';

    const variants = {
      primary:
        'bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow-md focus-visible:ring-brand-500 shadow-brand-600/20',
      secondary:
        'bg-brand-100 hover:bg-brand-200 text-brand-800 dark:bg-brand-950 dark:hover:bg-brand-900 dark:text-brand-300 focus-visible:ring-brand-400',
      outline:
        'border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus-visible:ring-slate-400',
      ghost:
        'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus-visible:ring-slate-400',
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow-md focus-visible:ring-rose-500 shadow-rose-600/20',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 min-h-[36px]',
      md: 'text-sm px-4 py-2.5 min-h-[44px]',
      lg: 'text-base px-6 py-3.5 min-h-[50px]',
      icon: 'p-2.5 min-h-[44px] min-w-[44px] rounded-2xl',
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <span>Memproses...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
