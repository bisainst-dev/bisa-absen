import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'outline' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default:
        'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none',
      flat: 'bg-slate-100/80 dark:bg-slate-900/80 border border-transparent',
      outline: 'bg-transparent border border-slate-200 dark:border-slate-800',
      interactive:
        'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand-500/50 transition-all duration-200 cursor-pointer active:scale-[0.99]',
    };

    return (
      <div
        ref={ref}
        className={twMerge(clsx('rounded-3xl p-5', variants[variant], className))}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
